/* global Opal */
const { PDFDocument } = require('pdf-lib')
const util = require('util')
const fsExtra = require('fs-extra')
const path = require('path')
const mkdirs = util.promisify(fsExtra.mkdirs)
const Browser = require('./browser.js')
const { addOutline } = require('./outline.js')
const { addMetadata } = require('./metadata')

const browserInstance = new Browser()

function registerTemplateConverter (processor, templates) {
  class TemplateConverter {
    constructor () {
      this.baseConverter = processor.Html5Converter.create()
      this.templates = templates
      this.backendTraits = {
        basebackend: 'html',
        outfilesuffix: '.pdf',
        htmlsyntax: 'html',
        supports_templates: true
      }
    }

    convert (node, transform, opts) {
      const template = this.templates[transform || node.node_name]
      if (template) {
        return template(node, this.baseConverter)
      }
      return this.baseConverter.convert(node, transform, opts)
    }
  }

  processor.ConverterFactory.register(new TemplateConverter(), ['html5'])
}

async function convert (processor, inputFile, options, timings, watch, preview) {
  const tempFile = getTemporaryHtmlFile(inputFile.path, options)
  let workingDir
  if (options.to_dir) {
    await mkdirs(options.to_dir)
    workingDir = options.to_dir
  } else {
    workingDir = path.dirname(inputFile.path)
  }
  const inputFilenameWithoutExt = path.basename(inputFile.path, path.extname(inputFile.path))
  let outputFile = path.join(workingDir, inputFilenameWithoutExt + '.pdf')
  let outputToStdout = false
  if (options.to_file) {
    if (options.to_file !== Opal.gvars.stdout) {
      await mkdirs(path.dirname(options.to_file))
      if (options.to_dir) {
        outputFile = path.join(options.to_dir, options.to_file)
      } else {
        outputFile = options.to_file
      }
    } else {
      outputToStdout = true
    }
  }
  const instanceOptions = Object.assign({}, options, { to_file: tempFile })
  let doc
  let timer

  if (timings) {
    timer = processor.Timings.create()
    instanceOptions.timings = timer
  }

  if (inputFile.contents) {
    // data from stdin
    doc = processor.convert(inputFile.contents, instanceOptions)
  } else {
    doc = processor.convertFile(inputFile.path, instanceOptions)
  }

  // if (typeof timer !== 'undefined' && timer !== null) {
  if (timings) {
    timer.printReport(process.stderr, inputFile.contents ? '-' : inputFile.path)
  }

  const puppeteerConfig = {
    headless: !preview,
    args: ['--no-sandbox', '--allow-file-access-from-files']
  }
  if (preview) {
    Object.assign(puppeteerConfig, { defaultViewport: null })
  }
  try {
    const page = await browserInstance.goto(`file://${tempFile}`, preview)
    const puppeteerDefaultTimeout = process.env.PUPPETEER_DEFAULT_TIMEOUT
    const printTimeout = process.env.PUPPETEER_PRINT_TIMEOUT || puppeteerDefaultTimeout || 30000

    if (!preview) {
      const pdfOptions = {
        printBackground: true,
        preferCSSPageSize: true,
        timeout: printTimeout
      }
      const pdfWidth = doc.getAttributes()['pdf-width']
      if (pdfWidth) {
        pdfOptions.width = pdfWidth
      }
      const pdfHeight = doc.getAttributes()['pdf-height']
      if (pdfHeight) {
        pdfOptions.height = pdfHeight
      }
      const format = doc.getAttributes()['pdf-format']
      if (format) {
        pdfOptions.format = format // Paper format. If set, takes priority over width or height options. Defaults to 'Letter'.
      }

      let pdf = await page.pdf(pdfOptions)
      // Outline is not yet implemented in Chromium, so we add it manually here.
      // https://bugs.chromium.org/p/chromium/issues/detail?id=840455
      let pdfDoc = await PDFDocument.load(pdf)
      pdfDoc = await addOutline(pdfDoc, doc)
      pdfDoc = await addMetadata(pdfDoc, doc)
      pdf = await pdfDoc.save()
      if (outputToStdout) {
        try {
          process.stdout.setDefaultEncoding('binary')
          process.stdout.write(Buffer.from(pdf).toString('binary'))
        } finally {
          process.stdout.setDefaultEncoding('utf-8') // reset
        }
      } else {
        fsExtra.writeFileSync(outputFile, pdf)
      }
    }
  } catch (err) {
    console.error('Unable to generate the PDF - Error: ' + err.toString())
    if (err && err.name === 'TimeoutError') {
      console.log('> TIP: You can configure the timeout in milliseconds using PUPPETEER_DEFAULT_TIMEOUT, PUPPETEER_NAVIGATION_TIMEOUT, PUPPETEER_RENDERING_TIMEOUT or PUPPETEER_PRINT_TIMEOUT environment variables.')
    }
  } finally {
    if (watch || preview) {
      if (!watch) {
        console.log('Preview mode entered, needs to be manually terminated using Ctrl+C!')
        await new Promise(resolve => {})
      }
    } else {
      await browserInstance.close()
    }
  }
}

function getTemporaryHtmlFile (inputFile, options) {
  const workingDir = path.dirname(inputFile)
  let baseFile = inputFile
  if (options.to_file) {
    if (options.to_file !== Opal.gvars.stdout) {
      baseFile = options.to_file
    }
  }
  const inputFilenameWithoutExt = path.basename(baseFile, path.extname(baseFile))
  let tempFile
  if (path.isAbsolute(workingDir)) {
    tempFile = path.join(workingDir, `${inputFilenameWithoutExt}.html`)
  } else {
    tempFile = path.normalize(path.join(process.cwd(), workingDir, `${inputFilenameWithoutExt}.html`))
  }
  return tempFile
}

module.exports = {
  convert: convert,
  registerTemplateConverter: registerTemplateConverter
}
