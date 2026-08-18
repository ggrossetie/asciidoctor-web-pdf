import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import {
  convert as asciidoctorConvert,
  convertFile as asciidoctorConvertFile,
  ConverterFactory,
  Html5Converter,
  Timings,
} from '@asciidoctor/core'
import fsExtra from 'fs-extra'
import { PDFDocument } from 'pdf-lib'
import Browser from './browser.js'
import { addMetadata } from './metadata.js'
import { addOutline } from './outline.js'
import { sanitizeNamedDestinations } from './pdf-destinations.js'

const require = createRequire(import.meta.url)
const mkdirs = promisify(fsExtra.mkdirs)

const isSea = (() => {
  try {
    return require('node:sea').isSea()
  } catch {
    return false
  }
})()

/**
 * Resolve the path to the Vivliostyle Viewer's `index.html`.
 *
 * @returns {string} Absolute path to the viewer entry point — next to the SEA
 *   binary (`viewer/index.html`) when running as a Node SEA, or inside
 *   `@vivliostyle/viewer` in `node_modules` otherwise.
 */
function getViewerIndexPath() {
  if (isSea) {
    return path.join(path.dirname(process.execPath), 'viewer', 'index.html')
  }
  const viewerPkgPath = require.resolve('@vivliostyle/viewer/package.json')
  return path.join(path.dirname(viewerPkgPath), 'lib', 'index.html')
}

const viewerIndexPath = getViewerIndexPath()
const browserInstance = new Browser()

/**
 * Register the `pdf` backend converter with Asciidoctor, wiring in optional
 * custom node templates.
 *
 * @param {object} templates - Map of node transform name (e.g. `paragraph`,
 *   `section`) to a template function `(node, baseConverter) => string`.
 *   A transform without a matching entry falls back to the base HTML5
 *   converter's own `convert(node, transform, opts)`.
 * @returns {void}
 */
export function registerTemplateConverter(templates) {
  class TemplateConverter {
    constructor() {
      this.baseConverter = new Html5Converter('html5')
      this.templates = templates
      this.backendTraits = {
        basebackend: 'html',
        outfilesuffix: '.pdf',
        filetype: 'pdf',
        htmlsyntax: 'html',
        supportsTemplates: true,
      }
    }

    handles(transform) {
      return (
        transform in this.templates || this.baseConverter.handles(transform)
      )
    }

    convert(node, transform, opts) {
      const template = this.templates[transform || node.nodeName]
      if (template) {
        return template(node, this.baseConverter)
      }
      return this.baseConverter.convert(node, transform, opts)
    }
  }

  ConverterFactory.register(new TemplateConverter(), ['pdf'])
}

/**
 * Convert a single AsciiDoc input file to PDF (or HTML, in preview mode).
 *
 * @param {{ path: string, contents?: string }} inputFile - The source file to convert.
 *   `path` is used to resolve the output location (and read the file, unless
 *   `contents` is provided directly, e.g. when reading from stdin).
 * @param {object} options - Asciidoctor processor options (`to_dir`, `to_file`,
 *   `backend`, attributes, etc.), forwarded to `Asciidoctor.convert`/`convertFile`.
 * @param {object} [config] - Conversion behavior flags.
 * @param {boolean} [config.timings=false] - Record Asciidoctor conversion timings
 *   and print the report to stderr.
 * @param {boolean} [config.watch=false] - Running under CLI watch mode. Suppresses
 *   `process.exitCode` mutation on failure and keeps the browser/temp HTML alive
 *   between calls instead of tearing them down.
 * @param {boolean} [config.preview=false] - Open the rendered document in a
 *   visible browser window instead of printing to PDF.
 * @param {boolean} [config.verbose=false] - Forward verbose logging to the
 *   underlying browser navigation.
 * @param {boolean} [config.preserveHtml=false] - Keep the intermediate temporary
 *   HTML file on disk after conversion instead of deleting it.
 * @param {boolean|string} [config.preprocessScripts] - When set, load the HTML in
 *   a browser and wait for scripts to complete before handing it to Vivliostyle.
 *   A string is used as the JS expression to wait for (see `--preprocess-scripts-wait-for`).
 * @param {Browser} [config.browser] - A shared `Browser` instance to reuse across
 *   multiple conversions (e.g. tests, CLI batch mode) instead of paying a
 *   launch+close cost per call. When omitted, falls back to the module-level
 *   singleton, which this function closes itself (single-shot CLI use).
 * @returns {Promise<void>}
 */
export async function convert(inputFile, options, config = {}) {
  const {
    timings,
    watch = false,
    preview = false,
    verbose = false,
    preserveHtml = false,
    preprocessScripts,
    browser,
  } = config
  const activeBrowser = browser || browserInstance
  const tempFile = getTemporaryHtmlFile(inputFile.path, options)
  let workingDir
  if (options.to_dir) {
    await mkdirs(options.to_dir)
    workingDir = options.to_dir
  } else {
    workingDir = path.dirname(inputFile.path)
  }
  const inputFilenameWithoutExt = path.basename(
    inputFile.path,
    path.extname(inputFile.path),
  )
  let outputFile = path.join(workingDir, `${inputFilenameWithoutExt}.pdf`)
  let outputToStdout = false
  if (options.to_file === false) {
    outputToStdout = true
  } else if (options.to_file) {
    await mkdirs(path.dirname(options.to_file))
    if (options.to_dir) {
      outputFile = path.join(options.to_dir, options.to_file)
    } else {
      outputFile = options.to_file
    }
  }
  const instanceOptions = Object.assign({ backend: 'pdf' }, options, {
    to_file: tempFile,
  })
  let doc
  let timer

  if (timings) {
    timer = new Timings()
    instanceOptions.timings = timer
  }

  if (inputFile.contents) {
    doc = await asciidoctorConvert(inputFile.contents, instanceOptions)
  } else {
    doc = await asciidoctorConvertFile(inputFile.path, instanceOptions)
  }

  if (timings) {
    timer.printReport(process.stderr, inputFile.contents ? '-' : inputFile.path)
  }

  try {
    // Resolve symlinks so the URL matches what Chromium will use internally for PDF Dests
    const realTempFile = fsExtra.realpathSync(tempFile)
    const docFileUrl = pathToFileURL(realTempFile).href
    if (preprocessScripts) {
      const enrichedHtml = await activeBrowser.preprocessScripts(
        docFileUrl,
        preprocessScripts,
        verbose,
      )
      await fsExtra.writeFile(realTempFile, enrichedHtml)
    }
    const viewerUrl = `${pathToFileURL(viewerIndexPath).href}#src=${docFileUrl}&bookMode=false&renderAllPages=true&spread=false`
    const page = await activeBrowser.goto(viewerUrl, preview, verbose)
    const puppeteerDefaultTimeout = process.env.PUPPETEER_DEFAULT_TIMEOUT
    const printTimeout =
      process.env.PUPPETEER_PRINT_TIMEOUT || puppeteerDefaultTimeout || 30000

    if (!preview) {
      const pdfOptions = {
        printBackground: true,
        preferCSSPageSize: true,
        timeout: printTimeout,
      }
      const pdfWidth = doc.attributes['pdf-width']
      if (pdfWidth) {
        pdfOptions.width = pdfWidth
      }
      const pdfHeight = doc.attributes['pdf-height']
      if (pdfHeight) {
        pdfOptions.height = pdfHeight
      }
      const format = doc.attributes['pdf-format']
      if (format) {
        pdfOptions.format = format
      }

      let pdf = await page.pdf(pdfOptions)
      let pdfDoc = await PDFDocument.load(pdf)
      pdfDoc = await addOutline(pdfDoc, doc, docFileUrl)
      sanitizeNamedDestinations(pdfDoc)
      pdfDoc = await addMetadata(pdfDoc, doc)
      pdf = await pdfDoc.save()
      if (outputToStdout) {
        try {
          process.stdout.setDefaultEncoding('binary')
          process.stdout.write(Buffer.from(pdf).toString('binary'))
        } finally {
          process.stdout.setDefaultEncoding('utf-8')
        }
      } else {
        fsExtra.writeFileSync(outputFile, pdf)
      }
    }
  } catch (err) {
    console.error(`Unable to generate the PDF - Error: ${err.toString()}`)
    if (err && err.name === 'TimeoutError') {
      console.log(
        '> TIP: You can configure the timeout in milliseconds using PUPPETEER_DEFAULT_TIMEOUT, PUPPETEER_NAVIGATION_TIMEOUT, PUPPETEER_RENDERING_TIMEOUT or PUPPETEER_PRINT_TIMEOUT environment variables.',
      )
    }
    if (!watch) {
      process.exitCode = 1
    }
  } finally {
    if (watch || preview) {
      if (!watch) {
        console.log(
          'Preview mode entered, needs to be manually terminated using Ctrl+C!',
        )
        await new Promise((_resolve) => {})
      }
    } else {
      if (!browser) {
        await browserInstance.close()
      }
      if (!preserveHtml) {
        await fsExtra.remove(tempFile)
      }
    }
  }
}

/**
 * Compute the path of the intermediate HTML file that Asciidoctor writes to
 * and that the Vivliostyle Viewer loads, derived from the eventual PDF
 * output location so the two files share a base name and directory.
 *
 * @param {string} inputFile - Path to the source AsciiDoc file.
 * @param {object} options - Asciidoctor processor options; `to_file`, when
 *   set, is used as the base name instead of `inputFile`.
 * @returns {string} Absolute path of the temporary `.html` file.
 */
function getTemporaryHtmlFile(inputFile, options) {
  const workingDir = path.dirname(inputFile)
  let baseFile = inputFile
  if (options.to_file && options.to_file !== false) {
    baseFile = options.to_file
  }
  const inputFilenameWithoutExt = path.basename(
    baseFile,
    path.extname(baseFile),
  )
  let tempFile
  if (path.isAbsolute(workingDir)) {
    tempFile = path.join(workingDir, `${inputFilenameWithoutExt}.html`)
  } else {
    tempFile = path.normalize(
      path.join(process.cwd(), workingDir, `${inputFilenameWithoutExt}.html`),
    )
  }
  return tempFile
}
