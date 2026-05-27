import { createRequire } from 'node:module'
import { dirname, isAbsolute, join, resolve, sep } from 'node:path'
import { Invoker, Options } from 'asciidoctor/cli'
import chokidar from 'chokidar'
import pkg from '../package.json' with { type: 'json' }
import {
  convert as convertPdf,
  registerTemplateConverter,
} from './converter.js'
import Lock from './lock.js'

const require = createRequire(import.meta.url)
const processorLock = new Lock()

const DOT_RELATIVE_RX = new RegExp(
  `^\\.{1,2}[/${sep.replace('/', '').replace('\\', '\\\\')}]`,
)

function requireLibrary(requirePath, cwd = process.cwd()) {
  if (requirePath.charAt(0) === '.' && DOT_RELATIVE_RX.test(requirePath)) {
    requirePath = resolve(requirePath)
  } else if (!isAbsolute(requirePath)) {
    const paths = [cwd, dirname(import.meta.dirname)].map((start) =>
      join(start, 'node_modules'),
    )
    requirePath = require.resolve(requirePath, { paths })
  }
  return require(requirePath)
}

export class PdfOptions extends Options {
  constructor() {
    super()
    this.addOption('template-require', {
      type: 'string',
      describe: 'require the specified template script',
      metavar: '<script>',
    })
    this.addOption('watch', {
      type: 'boolean',
      short: 'w',
      describe: 'enable watch mode',
    })
    this.addOption('preview', {
      type: 'boolean',
      describe: 'open browser for inspecting HTML before PDF conversion',
    })
  }

  _buildConvertOptions(extraAttrs = []) {
    return super._buildConvertOptions([
      'env-web-pdf',
      'env=web-pdf',
      ...extraAttrs,
    ])
  }
}

export class PdfInvoker extends Invoker {
  version() {
    return `Asciidoctor Web PDF ${pkg.version} [https://github.com/ggrossetie/asciidoctor-web-pdf]\n${super.version()}`
  }

  async invoke() {
    const { values } = this.options
    const templateRequireLib = values['template-require']
    let templates
    if (templateRequireLib) {
      const mod = requireLibrary(templateRequireLib)
      templates = mod.templates || mod
    } else {
      ;({ templates } = await import('./document/document-converter.js'))
    }
    registerTemplateConverter(templates)
    return super.invoke()
  }

  async convertFiles(files, options, values) {
    const { watch, preview, timings, verbose } = values
    await this._convertAll(files, options, timings, watch, preview, verbose)

    if (watch) {
      console.log(
        'Watch mode entered, needs to be manually terminated using Ctrl+C!',
      )
      const watchFiles = files.flatMap((file) => {
        const dir = dirname(file)
        const allSubdirPath = join(dir, '**')
        return [
          join(allSubdirPath, '*.css'),
          join(allSubdirPath, '*.js'),
          join(allSubdirPath, '*.adoc'),
          file,
        ]
      })
      chokidar
        .watch(watchFiles, { ignored: /(^|[/\\])\../ })
        .on('change', async (changedPath) => {
          if (verbose) console.log(`  file changed ${changedPath}`)
          try {
            const hasQueuedEvents = await processorLock.acquire()
            if (!hasQueuedEvents) {
              await this._convertAll(
                files,
                options,
                timings,
                watch,
                preview,
                verbose,
              )
            }
          } finally {
            processorLock.release()
          }
        })
    }
  }

  async _convertFromStdin(options) {
    const { values } = this.options
    const data = await readFromStdin()
    const fictiveInputFile = join(
      options.base_dir || process.cwd(),
      'asciidoctor-pdf-stdin.adoc',
    )
    await convertPdf(
      { path: fictiveInputFile, contents: data },
      options,
      values.timings,
      false,
      values.preview,
    )
  }

  async _exit(failureLevel) {
    if (this.options.values.watch) {
      return
    }
    return super._exit(failureLevel)
  }

  async _convertAll(files, options, timings, watch, preview, verbose) {
    for (const file of files) {
      if (verbose) console.log(`converting file ${file}`)
      await convertPdf({ path: file }, options, timings, watch, preview)
    }
  }
}

function readFromStdin() {
  return new Promise((resolve, reject) => {
    let data = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('readable', () => {
      const chunk = process.stdin.read()
      if (chunk !== null) data += chunk
    })
    process.stdin.on('error', reject)
    process.stdin.on('end', () => resolve(data.replace(/\n$/, '')))
  })
}
