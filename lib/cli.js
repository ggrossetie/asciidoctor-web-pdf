'use strict'

const pkg = require('../package.json')
const { Options, Invoker, processor } = require('@asciidoctor/cli')
const chokidar = require('chokidar')
const path = require('path')
const EventEmitter = require('events')
class ProcessorEmitter extends EventEmitter {}
const processorEmitter = new ProcessorEmitter()

const converter = require('./converter.js')

async function convertFiles (files, argv, options, verbose, preview) {
  for (const file of files) {
    if (verbose) {
      console.log(`converting file ${file}`)
    }
    await converter.convert(processor, file, options, argv.timings, argv.watch, preview)
  }
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
    if (files && files.length > 0) {
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
