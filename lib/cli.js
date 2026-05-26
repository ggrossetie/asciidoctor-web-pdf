const Lock = require('./lock.js')
const pkg = require('../package.json')
const { parseArgs } = require('node:util')
const { getVersion, getCoreVersion, Extensions } = require('@asciidoctor/core')
const chokidar = require('chokidar')
const ospath = require('node:path')
const processorLock = new Lock()

const converter = require('./converter.js')

const DOT_RELATIVE_RX = new RegExp(
  `^\\.{1,2}[/${ospath.sep.replace('/', '').replace('\\', '\\\\')}]`,
)

function requireLibrary(requirePath, cwd = process.cwd()) {
  if (requirePath.charAt(0) === '.' && DOT_RELATIVE_RX.test(requirePath)) {
    requirePath = ospath.resolve(requirePath)
  } else if (!ospath.isAbsolute(requirePath)) {
    const paths = [cwd, ospath.dirname(__dirname)].map((start) =>
      ospath.join(start, 'node_modules'),
    )
    requirePath = require.resolve(requirePath, { paths })
  }
  return require(requirePath)
}

function prepareProcessor(args) {
  const requirePaths = args.require
  if (requirePaths) {
    requirePaths.forEach((requirePath) => {
      const lib = requireLibrary(requirePath)
      if (lib && typeof lib.register === 'function') {
        lib.register(Extensions)
      }
    })
  }
}

async function readFromStdin() {
  return new Promise((resolve, reject) => {
    const chunks = []
    process.stdin.on('data', (chunk) => chunks.push(chunk))
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString()))
    process.stdin.on('error', reject)
  })
}

function versionString() {
  const releaseName = process.release ? process.release.name : 'node'
  return `Asciidoctor Web PDF ${pkg.version}
Asciidoctor.js ${getVersion()} (Asciidoctor core ${getCoreVersion()}) [https://asciidoctor.org]
Runtime Environment (${releaseName} ${process.version} on ${process.platform})`
}

function helpString() {
  return `Usage: asciidoctor-web-pdf [options...] files...
Translate the AsciiDoc source file or file(s) into PDF format.

Options:
  -b, --backend <backend>          set output format backend
  -d, --doctype <doctype>          document type [article, book, manpage, inline]
  -o, --out-file <file>            output file (default: based on input); use '' to output to STDOUT
  -S, --safe-mode <mode>           safe mode level [unsafe, safe, server, secure]
  -e, --embedded                   suppress enclosing document structure
  -s, --no-header-footer           suppress enclosing document structure
  -n, --section-numbers            auto-number section titles
  -B, --base-dir <dir>             base directory containing the document and resources
  -D, --destination-dir <dir>      destination output directory
      --failure-level <level>      minimum logging level for non-zero exit [INFO, WARN, ERROR, FATAL]
  -q, --quiet                      suppress warnings
      --trace                      include backtrace information on errors
  -v, --verbose                    enable verbose mode
  -t, --timings                    enable timings mode
  -a, --attribute <key=value>      document attribute (may be specified multiple times)
  -r, --require <library>          require library before executing processor (may be specified multiple times)
  -V, --version                    display version info
  -h, --help                       show this help
      --template-require <script>  require the specified template script
  -w, --watch                      enable watch mode
      --preview                    open browser for inspecting HTML before PDF conversion`
}

const CLI_OPTIONS = {
  backend: { type: 'string', short: 'b' },
  doctype: { type: 'string', short: 'd' },
  'out-file': { type: 'string', short: 'o' },
  'safe-mode': { type: 'string', short: 'S' },
  embedded: { type: 'boolean', short: 'e' },
  'no-header-footer': { type: 'boolean', short: 's' },
  'section-numbers': { type: 'boolean', short: 'n' },
  'base-dir': { type: 'string', short: 'B' },
  'destination-dir': { type: 'string', short: 'D' },
  'failure-level': { type: 'string' },
  quiet: { type: 'boolean', short: 'q' },
  trace: { type: 'boolean' },
  verbose: { type: 'boolean', short: 'v' },
  timings: { type: 'boolean', short: 't' },
  attribute: { type: 'string', short: 'a', multiple: true },
  require: { type: 'string', short: 'r', multiple: true },
  version: { type: 'boolean', short: 'V' },
  help: { type: 'boolean', short: 'h' },
  'template-require': { type: 'string' },
  watch: { type: 'boolean', short: 'w' },
  preview: { type: 'boolean' },
}

function buildAsciidoctorOptions(args, extraAttributes = []) {
  const attributes = [...extraAttributes]
  if (args['section-numbers']) {
    attributes.push('sectnums')
  }
  if (args.attribute) {
    attributes.push(...args.attribute)
  }
  const quiet = args.quiet || false
  const verbose = args.verbose || false
  const verboseMode = quiet ? 0 : verbose ? 2 : 1
  const embedded =
    args.embedded === true || args['no-header-footer'] === true || false

  const options = {
    safe: args['safe-mode'] || 'unsafe',
    standalone: !embedded,
    verbose: verboseMode,
    timings: args.timings || false,
    trace: args.trace || false,
    attributes,
    mkdirs: true,
  }
  if (args.doctype) options.doctype = args.doctype
  if (args.backend) options.backend = args.backend
  if (args['base-dir'] != null) options.base_dir = args['base-dir']
  if (args['destination-dir'] != null) options.to_dir = args['destination-dir']

  const outFile = args['out-file']
  if (outFile === '') {
    options.to_file = process.stdout
  } else if (outFile != null) {
    options.to_file = outFile
  }
  return options
}

async function convertFiles(files, args, asciidoctorOptions, verbose, preview) {
  for (const file of files) {
    if (verbose) {
      console.log(`converting file ${file.contents ? '-' : file.path}`)
    }
    await converter.convert(
      file,
      asciidoctorOptions,
      args.timings,
      args.watch,
      preview,
    )
  }
}

class PdfOptions {
  constructor() {
    this._defaultAttributes = ['env-web-pdf', 'env=web-pdf']
  }

  parse(argv) {
    const processArgs = argv.slice(2)
    let parsed
    try {
      parsed = parseArgs({
        args: processArgs,
        options: CLI_OPTIONS,
        allowPositionals: true,
      })
    } catch (err) {
      console.error(`Error: ${err.message}`)
      process.exit(1)
    }
    const { values, positionals } = parsed
    const stdin =
      positionals.length === 0 && processArgs[processArgs.length - 1] === '-'
    if (stdin && values['out-file'] == null) {
      values['out-file'] = ''
    }
    const asciidoctorOptions = buildAsciidoctorOptions(
      values,
      this._defaultAttributes,
    )
    return {
      argv,
      args: { ...values, files: positionals },
      options: asciidoctorOptions,
      stdin,
    }
  }
}

class PdfInvoker {
  constructor(options) {
    this.options = options
  }

  async invoke() {
    const cliOptions = this.options
    const processArgs = cliOptions.argv.slice(2)
    const { args } = cliOptions
    const { verbose, version, files, watch, preview } = args
    const templateRequireLib = args['template-require']

    if (args.help) {
      console.log(helpString())
      return { exit: true }
    }
    if (version || (verbose && processArgs.length === 1)) {
      console.log(versionString())
      return { exit: true }
    }

    let templates
    if (templateRequireLib) {
      templates = requireLibrary(templateRequireLib)
    } else {
      templates = require('./document/document-converter').templates
    }
    converter.registerTemplateConverter(templates)
    prepareProcessor(args)

    const asciidoctorOptions = cliOptions.options

    if (cliOptions.stdin) {
      const fictiveInputFile = `${asciidoctorOptions.base_dir || process.cwd()}/asciidoctor-pdf-stdin.adoc`
      const data = await readFromStdin()
      const fileObjects = [{ path: fictiveInputFile, contents: data }]
      await convertFiles(
        fileObjects,
        args,
        asciidoctorOptions,
        verbose,
        preview,
      )
      return { exit: false }
    } else if (files && files.length > 0) {
      const fileObjects = files.map((file) => ({ path: file }))
      await convertFiles(
        fileObjects,
        args,
        asciidoctorOptions,
        verbose,
        preview,
      )
      if (watch) {
        const watchFiles = files.map((file) => {
          const dirname = ospath.dirname(file)
          const allSubdirPath = ospath.join(dirname, '**')
          return [
            ospath.join(allSubdirPath, '*.css'),
            ospath.join(allSubdirPath, '*.js'),
            ospath.join(allSubdirPath, '*.adoc'),
            file,
          ]
        })
        console.log(
          'Watch mode entered, needs to be manually terminated using Ctrl+C!',
        )
        chokidar
          .watch(watchFiles, { ignored: /(^|[/\\])\../ })
          .on('change', async (changedPath) => {
            if (verbose) {
              console.log(`  file changed ${changedPath}`)
            }
            try {
              const hasQueuedEvents = await processorLock.acquire()
              if (!hasQueuedEvents) {
                await convertFiles(
                  fileObjects,
                  args,
                  asciidoctorOptions,
                  verbose,
                  preview,
                )
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
      console.log(helpString())
      return { exit: true }
    }
  }
}

module.exports = {
  PdfOptions,
  PdfInvoker,
}
