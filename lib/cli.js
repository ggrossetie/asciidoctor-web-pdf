'use strict'

const fs = require('fs')
const pkg = require('../package.json')
const { Options, Invoker, processor } = require('@asciidoctor/cli')
const chokidar = require('chokidar')
const path = require('path')
const EventEmitter = require('events')
class ProcessorEmitter extends EventEmitter {}
const processorEmitter = new ProcessorEmitter()

const converter = require('./converter.js')
const stdin = require('./stdin')

async function convertFiles (files, argv, options, verbose, preview) {
  for (const file of files) {
    if (verbose) {
      console.log(`converting file ${file}`)
    }
    await converter.convert(processor, file, options, argv.timings, argv.watch, preview)
  }
}

function getTemporaryAdocFile (workingDir) {
  let tempFile
  // random file name for stdin data
  const name = 'asciidoctor-pdf-' + Math.random().toString(36).substring(2, 15)
  if (path.isAbsolute(workingDir)) {
    tempFile = path.join(workingDir, `${name}.adoc`)
  } else {
    tempFile = path.normalize(path.join(process.cwd(), workingDir, `${name}.adoc`))
  }
  return tempFile
}

class PdfOptions {
  constructor () {
    this.options = new Options()
      .addOption('template-require', {
        describe: 'require the specified template script',
        type: 'string'
      })
      .addOption('watch', {
        alias: 'w',
        default: false,
        describe: 'enable watch mode',
        type: 'boolean'
      })
      .addOption('preview', {
        default: false,
        describe: 'open the otherwise headless browser for inspecting the generated HTML document (before it gets converted to PDF)',
        type: 'boolean'
      })
  }

  parse (argv) {
    return this.options.parse(argv)
  }
}

let processing = false
let shouldEmitRequestEvent = false
processorEmitter.on('request', async (files, args, options, verbose, preview) => {
  try {
    // prevent multiprocessing.
    if (!processing) {
      processing = true
      try {
        await convertFiles(files, args, options, verbose, preview)
      } finally {
        processing = false
        if (shouldEmitRequestEvent) {
          shouldEmitRequestEvent = false
          processorEmitter.emit('request', files, args, options, verbose, preview)
        }
      }
    } else {
      shouldEmitRequestEvent = true
    }
  } catch (e) {
    console.log('error', e)
  }
})

class PdfInvoker extends Invoker {
  async invoke () {
    const processArgs = this.options.argv.slice(2)
    const { args } = this.options
    const { verbose, version, files, watch, 'template-require': templateRequireLib, preview } = args
    if (version || (verbose && processArgs.length === 1)) {
      process.stdout.write(`Asciidoctor PDF ${pkg.version} using `)
      Invoker.printVersion()
      return { exit: true }
    }
    let templates
    if (templateRequireLib) {
      templates = Invoker.requireLibrary(templateRequireLib)
    } else {
      templates = require('./document/templates.js')
    }
    converter.registerTemplateConverter(processor, templates)
    Invoker.prepareProcessor(args, processor)
    const options = this.options.options
    if (this.options.stdin) {
      const dir = this.options.base_dir || this.options.doc_dir || process.cwd()
      const adocFile = getTemporaryAdocFile(dir)
      const adocFilePath = path.parse(adocFile) 
      const htmlFilePath = path.join(adocFilePath.dir, adocFilePath.name + '.html')
      stdin.read((data) => {
        fs.writeFile(adocFile, data, { flag: 'wx' }, function (err) {
          if (err) throw err
          convertFiles([adocFile], args, options, verbose, preview).then(() => {
            // this should be handled async but skills inadequate :-(
            fs.unlinkSync(adocFile)
            fs.unlinkSync(htmlFilePath)
          })
        })
      })
      return { exit: false }
    } else if (files && files.length > 0) {
      await convertFiles(files, args, options, verbose, preview)
      if (watch) {
        const watchFiles = files.map((file) => {
          const dirname = path.dirname(file)
          const allSubdirPath = path.join(dirname, '**')
          return [
            path.join(allSubdirPath, '*.css'),
            path.join(allSubdirPath, '*.js'),
            path.join(allSubdirPath, '*.adoc'),
            file
          ]
        })
        console.log('Watch mode entered, needs to be manually terminated using Ctrl+C!')
        chokidar.watch(watchFiles, { ignored: /(^|[/\\])\../ }).on('change', async (path) => {
          if (verbose) {
            console.log(`  file changed ${path}`)
          }
          processorEmitter.emit('request', files, args, options, verbose, preview)
        })
        return { exit: false }
      } else {
        return { exit: true }
      }
    } else {
      this.showHelp()
      return { exit: true }
    }
  }
}

module.exports = {
  PdfOptions: PdfOptions,
  PdfInvoker: PdfInvoker
}
