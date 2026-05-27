import { createRequire } from 'node:module'
import path from 'node:path'
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

const require = createRequire(import.meta.url)
const mkdirs = promisify(fsExtra.mkdirs)

const isSea = (() => {
  try {
    return require('node:sea').isSea()
  } catch {
    return false
  }
})()

function getViewerIndexPath() {
  if (isSea) {
    return path.join(path.dirname(process.execPath), 'viewer', 'index.html')
  }
  const viewerPkgPath = require.resolve('@vivliostyle/viewer/package.json')
  return path.join(path.dirname(viewerPkgPath), 'lib', 'index.html')
}

const viewerIndexPath = getViewerIndexPath()
const browserInstance = new Browser()

export function registerTemplateConverter(templates) {
  class TemplateConverter {
    constructor() {
      this.baseConverter = new Html5Converter('html5')
      this.templates = templates
      this.backendTraits = {
        basebackend: 'html',
        outfilesuffix: '.pdf',
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

  ConverterFactory.register(new TemplateConverter(), ['html5'])
}

export async function convert(
  inputFile,
  options,
  timings,
  watch,
  preview,
  verbose,
) {
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
  const instanceOptions = Object.assign({}, options, { to_file: tempFile })
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
    const viewerUrl = `file://${viewerIndexPath}#src=file://${realTempFile}&bookMode=false&renderAllPages=true&spread=false`
    const page = await browserInstance.goto(viewerUrl, preview, verbose)
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
      pdfDoc = await addOutline(pdfDoc, doc, `file://${realTempFile}`)
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
  } finally {
    if (watch || preview) {
      if (!watch) {
        console.log(
          'Preview mode entered, needs to be manually terminated using Ctrl+C!',
        )
        await new Promise((_resolve) => {})
      }
    } else {
      await browserInstance.close()
    }
  }
}

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
