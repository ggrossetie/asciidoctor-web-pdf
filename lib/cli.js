'use strict'

const pkg = require('../package.json')
const { Options, Invoker, processor } = require('@asciidoctor/cli')
const chokidar = require('chokidar')

const converter = require('./converter.js')

async function convertFiles (files, argv, options, verbose) {
  for (let file of files) {
    if (verbose) {
      console.log(`converting file ${file}`)
    }
    await converter.convert(processor, file, options, argv['timings'])
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
  }

  parse (argv) {
    return this.options.parse(argv)
  }
}

class PdfInvoker extends Invoker {
  constructor (options) {
    super(options)
  }

  async invoke () {
    const processArgs = this.options.argv.slice(2)
    const args = this.options.args
    const verbose = args['verbose']
    const version = args['version']
    const files = args['files']
    const watch = args['watch']
    const templateRequireLib = args['template-require']
    if (version || (verbose && processArgs.length === 1)) {
      process.stdout.write(`Asciidoctor PDF ${pkg.version} using `)
      Invoker.printVersion()
      return { exit: true }
    }
    if (templateRequireLib) {
      converter.registerTemplateConverter(processor,  Invoker.requireLibrary(templateRequireLib))
    }
    Invoker.prepareProcessor(args, processor)
    const options = this.options.options
    if (files && files.length > 0) {
      await convertFiles(files, args, options, verbose)
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
        chokidar.watch(watchFiles, { ignored: /(^|[\/\\])\../ }).on('all', async (event, path) => {
          if (event === 'change') {
            console.log('  ' + event, path)
            try {
              await convertFiles(files, argv, options, verbose)
            } catch (e) {
              console.log('error', e);
            }
          }
        });
        return { exit: false };
      } else {
        return { exit: true };
      }
    } else {
      this.showHelp()
      return { exit: true };
    }
  }
}

module.exports = {
  PdfOptions: PdfOptions,
  PdfInvoker: PdfInvoker
}
