import { createRequire } from 'node:module'
import { dirname, isAbsolute, join, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
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

async function importLibrary(requirePath, cwd = process.cwd()) {
  if (requirePath.charAt(0) === '.' && DOT_RELATIVE_RX.test(requirePath)) {
    requirePath = resolve(requirePath)
  } else if (!isAbsolute(requirePath)) {
    const paths = [cwd, dirname(import.meta.dirname)].map((start) =>
      join(start, 'node_modules'),
    )
    requirePath = require.resolve(requirePath, { paths })
  }
  return import(pathToFileURL(requirePath).href)
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
    this.addOption('preserve-html', {
      type: 'boolean',
      describe: 'preserve the intermediate HTML file after conversion',
    })
    this.addOption('preprocess-scripts', {
      type: 'boolean',
      describe: 'load the HTML in a browser, wait for scripts to complete (networkidle0), then pass the enriched HTML to Vivliostyle',
    })
    this.addOption('preprocess-scripts-wait-for', {
      type: 'string',
      describe:
        'a JavaScript expression to wait for after networkidle0 during script preprocessing (implies --preprocess-scripts).\n' +
        "Example: set a signal in your HTML when scripts are done:\n" +
        "  <script>myLib.renderAll().then(() => document.body.setAttribute('data-scripts-ready', 'true'))</script>\n" +
        "then use: --preprocess-scripts-wait-for \"document.body.hasAttribute('data-scripts-ready')\"",
      metavar: '<expression>',
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
      const mod = await importLibrary(templateRequireLib)
      templates = mod.templates || mod.default?.templates || mod.default || mod
    } else {
      ;({ templates } = await import('./document/document-converter.js'))
    }
    registerTemplateConverter(templates)
    return super.invoke()
  }

  async convertFiles(files, options, values) {
    const { watch, preview, timings, verbose } = values
    const preserveHtml = values['preserve-html']
    const preprocessScripts = values['preprocess-scripts-wait-for'] ?? values['preprocess-scripts']
    await this._convertAll(files, options, timings, watch, preview, verbose, preserveHtml, preprocessScripts)

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
                preserveHtml,
                preprocessScripts,
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
      values.verbose,
      values['preserve-html'],
      values['preprocess-scripts-wait-for'] ?? values['preprocess-scripts'],
    )
  }

  async _exit(failureLevel) {
    if (this.options.values.watch) {
      return
    }
    return super._exit(failureLevel)
  }

  async _convertAll(files, options, timings, watch, preview, verbose, preserveHtml, preprocessScripts) {
    for (const file of files) {
      if (verbose) console.log(`converting file ${file}`)
      await convertPdf(
        { path: file },
        options,
        timings,
        watch,
        preview,
        verbose,
        preserveHtml,
        preprocessScripts,
      )
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
