/* global Opal */
'use strict'

// NOTE: we should extend asciidoctor-cli.js

const yargs = require('yargs')
const converter = require('./converter')
const chokidar = require('chokidar')
const path = require('path')

function convertOptions (argv) {
  const backend = argv['backend']
  const doctype = argv['doctype']
  const safeMode = argv['safe-mode']
  const noHeaderFooter = argv['no-header-footer']
  const sectionNumbers = argv['section-numbers']
  const baseDir = argv['base-dir']
  const destinationDir = argv['destination-dir']
  const quiet = argv['quiet']
  const verbose = argv['verbose']
  const timings = argv['timings']
  const trace = argv['trace']
  const requireLib = argv['require']
  const templateRequireLib = argv['template-require']
  if (verbose) {
    console.log('require ' + requireLib)
    console.log('template-require ' + templateRequireLib)
    console.log('backend ' + backend)
    console.log('doctype ' + doctype)
    console.log('header-footer ' + !noHeaderFooter)
    console.log('section-numbers ' + sectionNumbers)
    console.log('quiet ' + quiet)
    console.log('verbose ' + verbose)
    console.log('timings ' + timings)
    console.log('trace ' + trace)
    console.log('base-dir ' + baseDir)
    console.log('destination-dir ' + destinationDir)
  }
  if (requireLib) {
    require(requireLib)
  }
  const verboseMode = quiet ? 0 : verbose ? 2 : 1
  const attributes = []
  if (noHeaderFooter) {
    attributes.push('showtitle')
  }
  if (sectionNumbers) {
    attributes.push('sectnums')
  }
  const cliAttributes = argv['attribute']
  if (cliAttributes) {
    attributes.push(...cliAttributes)
  }
  if (verbose) {
    console.log('verbose-mode ' + verboseMode)
    console.log('attributes ' + attributes)
  }
  const options = {
    backend: backend,
    doctype: doctype,
    safe: safeMode,
    header_footer: !noHeaderFooter,
    verbose: verboseMode,
    timings: timings,
    trace: trace
  }
  if (baseDir != null) {
    options.base_dir = baseDir
  }
  if (destinationDir != null) {
    options.to_dir = destinationDir
  }
  options.to_file = false
  options.attributes = attributes
  if (templateRequireLib) {
    options.templates = require(templateRequireLib)
  }
  if (verbose) {
    console.log('options ' + JSON.stringify(options))
  }
  return options
}

function argsParser () {
  return yargs
    .detectLocale(false)
    .wrap(Math.min(120, yargs.terminalWidth()))
    .command('$0 [files...]', '', function (yargs) {
      return yargs
        .option('doctype', {
          alias: 'd',
          default: 'article',
          describe: 'document type to use when converting document',
          choices: ['article', 'book', 'manpage', 'inline']
        })
        .option('template-require', {
          describe: 'require the specified template script',
          type: 'string'
        })
        .option('out-file', {
          alias: 'o',
          describe: 'output file (default: based on path of input file) use \'\' to output to STDOUT',
          type: 'string'
        })
        .option('safe-mode', {
          alias: 'S',
          default: 'unsafe',
          describe: 'set safe mode level explicitly, disables potentially dangerous macros in source files, such as include::[]',
          choices: ['unsafe', 'safe', 'server', 'secure']
        })
        .option('no-header-footer', {
          alias: 's',
          default: false,
          describe: 'suppress output of header and footer',
          type: 'boolean'
        })
        .option('section-numbers', {
          alias: 'n',
          default: false,
          describe: 'auto-number section titles in the HTML backend disabled by default',
          type: 'boolean'
        })
        .option('base-dir', {
          // QUESTION: should we check that the directory exists ? coerce to a directory ?
          alias: 'B',
          describe: 'base directory containing the document and resources (default: directory of source file)',
          type: 'string'
        })
        .option('destination-dir', {
          // QUESTION: should we check that the directory exists ? coerce to a directory ?
          alias: 'D',
          describe: 'destination output directory (default: directory of source file)',
          type: 'string'
        })
        .option('quiet', {
          alias: 'q',
          default: false,
          describe: 'suppress warnings',
          type: 'boolean'
        })
        .option('trace', {
          default: false,
          describe: 'include backtrace information on errors',
          type: 'boolean'
        })
        .option('verbose', {
          alias: 'v',
          default: false,
          describe: 'enable verbose mode',
          type: 'boolean'
        })
        .option('timings', {
          alias: 't',
          default: false,
          describe: 'enable timings mode',
          type: 'boolean'
        })
        .option('attribute', {
          alias: 'a',
          array: true,
          describe: 'a document attribute to set in the form of key, key! or key=value pair',
          type: 'string'
        })
        .option('require', {
          alias: 'r',
          array: true,
          describe: 'require the specified library before executing the processor, using the standard Node require',
          type: 'string'
        })
        .option('watch', {
          alias: 'w',
          default: false,
          describe: 'enable watch mode',
          type: 'boolean'
        })
        .option('version', {
          alias: 'V',
          default: false,
          describe: 'display the version and runtime environment (or -v if no other flags or arguments)',
          type: 'boolean'
        })
    })
    .help()
}

async function convertFiles (files, argv, options, verbose) {
  for (let file of files) {
    if (verbose) {
      console.log(`converting file ${file}`)
    }
    if (argv['timings']) {
      const timings = asciidoctor.Timings.$new()
      const instanceOptions = Object.assign({}, options, { timings: timings })
      await converter.convert(file, instanceOptions)
      timings.$print_report(Opal.gvars.stderr, file)
    } else {
      await converter.convert(file, options)
    }
  }
}

async function run (argv) {
  const verbose = argv['verbose']
  const version = argv['version']
  const files = argv['files']
  const watch = argv['watch']
  const options = convertOptions(argv)
  if (version || (verbose && files && files.length === 0)) {
    console.log(`Asciidoctor ${asciidoctor.getCoreVersion()} [http://asciidoctor.org]`)
    const releaseName = process.release ? process.release.name : 'node'
    console.log(`Runtime Environment (${releaseName} ${process.version} on ${process.platform})`)
  } else if (files && files.length > 0) {
    await convertFiles(files, argv, options, verbose)
    if (watch) {
      const watchFiles = files.map((file) => {
        let dirname = path.dirname(file)
        return [path.join(dirname, '**', '*.css'), path.join(dirname, '**', '*.js')]
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
    yargs.showHelp()
    return { exit: true };
  }
}

module.exports = {
  run: run,
  argsParser: argsParser
}
