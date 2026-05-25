'use strict'

const Lock = require('./lock.js')
const pkg = require('../package.json')
const { parseArgs } = require('node:util')
const { createInterface } = require('node:readline')
const { getVersion, getCoreVersion } = require('@asciidoctor/core')
const path = require('path')
const chokidar = require('chokidar')
const converter = require('./converter.js')
const processorLock = new Lock()

const DOT_RELATIVE_RX = /^\.{1,2}[/\\]/

function requireLibrary (requirePath, cwd = process.cwd()) {
  if (requirePath.charAt(0) === '.' && DOT_RELATIVE_RX.test(requirePath)) {
    requirePath = path.resolve(requirePath)
  } else if (!path.isAbsolute(requirePath)) {
    const paths = [cwd, path.dirname(__dirname)].map((start) => path.join(start, 'node_modules'))
    requirePath = require.resolve(requirePath, { paths })
  }
  return require(requirePath)
}

async function readFromStdin () {
  return new Promise((resolve) => {
    let data = ''
    const rl = createInterface({ input: process.stdin })
    rl.on('line', (line) => { data += line + '\n' })
    rl.on('close', () => resolve(data))
  })
}

function buildAsciidoctorOptions (args, defaultAttributes = []) {
  const attributes = [...defaultAttributes]
  if (args['section-numbers']) attributes.push('sectnums')
  if (args.attribute) {
    const cliAttrs = Array.isArray(args.attribute) ? args.attribute : [args.attribute]
    attributes.push(...cliAttrs)
  }

  const options = {
    attributes,
    standalone: !(args.embedded || args['no-header-footer']),
    verbose: args.quiet ? 0 : args.verbose ? 2 : 1,
    timings: !!args.timings,
    mkdirs: true,
  }

  if (args.backend) options.backend = args.backend
  if (args.doctype) options.doctype = args.doctype
  if (args['safe-mode']) options.safe = args['safe-mode']
  if (args['base-dir'] != null) options.base_dir = args['base-dir']
  if (args['destination-dir'] != null) options.to_dir = args['destination-dir']
  if (args['template-dir']) options.template_dirs = args['template-dir']
  if (args['template-engine']) options.template_engine = args['template-engine']
  if (typeof args['out-file'] !== 'undefined') {
    options.to_file = args['out-file'] === '' ? process.stdout : args['out-file']
  }

  return options
}

const CLI_PARSE_OPTIONS = {
  attribute: { type: 'string', multiple: true, short: 'a' },
  backend: { type: 'string', short: 'b' },
  'base-dir': { type: 'string', short: 'B' },
  'destination-dir': { type: 'string', short: 'D' },
  doctype: { type: 'string', short: 'd' },
  embedded: { type: 'boolean', short: 'e' },
  'no-header-footer': { type: 'boolean', short: 's' },
  'section-numbers': { type: 'boolean', short: 'n' },
  'out-file': { type: 'string', short: 'o' },
  quiet: { type: 'boolean', short: 'q' },
  require: { type: 'string', multiple: true, short: 'r' },
  'safe-mode': { type: 'string', short: 'S' },
  timings: { type: 'boolean', short: 't' },
  verbose: { type: 'boolean', short: 'v' },
  version: { type: 'boolean', short: 'V' },
  'template-require': { type: 'string' },
  watch: { type: 'boolean', short: 'w' },
  preview: { type: 'boolean' },
}

class PdfOptions {
  constructor () {
    this._defaultAttributes = ['env-web-pdf', 'env=web-pdf']
    this.argv = []
    this.args = {}
    this.options = {}
    this.stdin = false
  }

  parse (argv) {
    this.argv = argv
    const processArgs = argv.slice(2)

    const { values, positionals } = parseArgs({
      args: processArgs,
      options: CLI_PARSE_OPTIONS,
      allowPositionals: true,
      strict: false,
    })

    this.args = Object.assign({}, values)
    this.args.files = positionals

    this.stdin = positionals.length === 0 && processArgs[processArgs.length - 1] === '-'
    if (this.stdin && !this.args['out-file']) {
      this.args['out-file'] = ''
    }

    this.options = buildAsciidoctorOptions(this.args, this._defaultAttributes)
    return this
  }
}

class PdfInvoker {
  constructor (options) {
    this.options = options
  }

  async invoke () {
    const cliOptions = this.options
    const processArgs = cliOptions.argv.slice(2)
    const { verbose, version, files, watch, 'template-require': templateRequireLib, preview } = cliOptions.args

    if (version || (verbose && processArgs.length === 1)) {
      this.showVersion()
      return { exit: true }
    }

    let templates
    if (templateRequireLib) {
      templates = requireLibrary(templateRequireLib)
    } else {
      templates = require('./document/document-converter').templates
    }

    converter.registerTemplateConverter(templates)

    if (cliOptions.args.require) {
      const { Extensions } = require('@asciidoctor/core')
      const requirePaths = Array.isArray(cliOptions.args.require) ? cliOptions.args.require : [cliOptions.args.require]
      for (const requirePath of requirePaths) {
        const lib = requireLibrary(requirePath)
        if (lib && typeof lib.register === 'function') {
          lib.register(Extensions)
        }
      }
    }

    const asciidoctorOptions = cliOptions.options

    if (cliOptions.stdin) {
      const fictiveInputFile = `${asciidoctorOptions.base_dir || process.cwd()}/asciidoctor-pdf-stdin.adoc`
      const data = await readFromStdin()
      await convertFiles([{ path: fictiveInputFile, contents: data }], cliOptions.args, asciidoctorOptions, verbose, preview)
      return { exit: false }
    } else if (files && files.length > 0) {
      const fileObjects = files.map(file => ({ path: file }))
      await convertFiles(fileObjects, cliOptions.args, asciidoctorOptions, verbose, preview)
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
        chokidar.watch(watchFiles, { ignored: /(^|[/\\])\../ }).on('change', async (changedPath) => {
          if (verbose) console.log(`  file changed ${changedPath}`)
          try {
            const hasQueuedEvents = await processorLock.acquire()
            if (!hasQueuedEvents) {
              await convertFiles(fileObjects, cliOptions.args, asciidoctorOptions, verbose, preview)
            }
          } finally {
            processorLock.release()
          }
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

  showVersion () {
    console.log(this.version())
  }

  showHelp () {
    console.log(`Usage: asciidoctor-web-pdf [options] files...

Options:
  -a, --attribute <key=value>    document attribute (can be used multiple times)
  -b, --backend <name>           output format backend
  -B, --base-dir <dir>           base directory
  -D, --destination-dir <dir>    destination output directory
  -d, --doctype <type>           document type [article, book, manpage, inline]
  -e, --embedded                 suppress enclosing document structure
  -s, --no-header-footer         suppress header/footer
  -n, --section-numbers          auto-number section titles
  -o, --out-file <file>          output file (use '' for STDOUT)
  -q, --quiet                    suppress warnings
  -r, --require <path>           require library before executing
  -S, --safe-mode <level>        safe mode [unsafe, safe, server, secure]
  -t, --timings                  enable timings mode
  -v, --verbose                  enable verbose mode
  -V, --version                  display version
  -w, --watch                    enable watch mode
      --preview                  open browser for inspection
      --template-require <path>  require custom template script
`)
  }

  version () {
    return `Asciidoctor Web PDF ${pkg.version} using Asciidoctor.js ${getVersion()} (Asciidoctor ${getCoreVersion()}) [https://asciidoctor.org]
Runtime Environment (node ${process.version} on ${process.platform})`
  }
}

async function convertFiles (files, argv, options, verbose, preview) {
  for (const file of files) {
    if (verbose) {
      console.log(`converting file ${file.contents ? '-' : file.path}`)
    }
    await converter.convert(file, options, argv.timings, argv.watch, preview)
  }
}

module.exports = {
  PdfOptions: PdfOptions,
  PdfInvoker: PdfInvoker,
}