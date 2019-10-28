/* global Opal */
const util = require('util')
const fsExtra = require('fs-extra')
const path = require('path')
const mkdirs = util.promisify(fsExtra.mkdirs)
const puppeteer = require('puppeteer')
const { addOutline } = require('./outline.js')

function registerTemplateConverter (processor, templates) {
  class TemplateConverter {
    constructor () {
      this.baseConverter = processor.Html5Converter.create()
      this.templates = templates
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

async function convert (processor, inputFile, options, timings, preview) {
  const tempFile = getTemporaryHtmlFile(inputFile, options)
  let workingDir
  if (options.to_dir) {
    await mkdirs(options.to_dir)
    workingDir = options.to_dir
  } else {
    workingDir = path.dirname(inputFile)
  }
  const inputFilenameWithoutExt = path.basename(inputFile, path.extname(inputFile))
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
  options.to_file = tempFile
  let doc
  if (timings) {
    const timings = processor.Timings.$new()
    const instanceOptions = Object.assign({}, options, { timings: timings })
    doc = processor.convertFile(inputFile, instanceOptions)
    timings.$print_report(Opal.gvars.stderr, inputFile)
  } else {
    doc = processor.convertFile(inputFile, options)
  }
  const puppeteerConfig = {
    headless: !preview,
    args: ['--no-sandbox', '--allow-file-access-from-files']
  }
  if (preview) {
    Object.assign(puppeteerConfig, { defaultViewport: null })
  }
  const browser = await puppeteer.launch(puppeteerConfig)
  try {
    const pages = await browser.pages()
    let page
    if (pages && pages.length > 0) {
      page = pages[0]
    } else {
      page = await browser.newPage()
    }
    page
      .on('pageerror', err => console.log('Page error: ' + err.toString()))
      .on('error', err => console.log('Error: ' + err.toString()))
    await page.goto('file://' + tempFile, { waitUntil: 'networkidle2' })
    if (!preview) {
      const pdfOptions = {
        printBackground: true,
        preferCSSPageSize: true
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
      pdf = await addOutline(pdf, doc)
      if (outputToStdout) {
        console.log(pdf.toString())
      } else {
        fsExtra.writeFileSync(outputFile, pdf)
      }
    }
  } finally {
    try {
      if (preview) {
        console.log('Preview mode entered, needs to be manually terminated using Ctrl+C!')
        await new Promise(resolve => {})
      } else {
        await browser.close()
      }
    } catch (err) {
      console.log('Unable to close the browser - Error: ' + err.toString())
    }
  }
}

function getTemporaryHtmlFile (inputFile) {
  const workingDir = path.dirname(inputFile)
  const inputFilenameWithoutExt = path.basename(inputFile, path.extname(inputFile))
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
