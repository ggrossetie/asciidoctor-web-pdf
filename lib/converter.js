/* global Opal */
const util = require('util')
const fs = require('fs')
const fsExtra = require('fs-extra')
const path = require('path')
const mkdirs = util.promisify(fsExtra.mkdirs)
const puppeteer = require('puppeteer')

function registerTemplateConverter (processor, templates) {
  class TemplateConverter {
    constructor () {
      this.baseConverter = processor.Html5Converter.create()
      this.templates = templates
    }

    convert (node, transform, opts) {
      const template = this.templates[transform || node.node_name]
      if (template) {
        return template(node)
      }
      return this.baseConverter.convert(node, transform, opts)
    }
  }

  processor.ConverterFactory.register(new TemplateConverter(), ['html5'])
}

async function convert (processor, inputFile, options, timings) {
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
    headless: true,
    args: ['--no-sandbox', '--allow-file-access-from-files']
  }
  const browser = await puppeteer.launch(puppeteerConfig)
  try {
    const page = await browser.newPage()
    page
      .on('pageerror', err => console.log('Page error: ' + err.toString()))
      .on('error', err => console.log('Error: ' + err.toString()))
    await page.goto('file://' + tempFile, { waitUntil: 'networkidle2' })
    const pdfOptions = {
      printBackground: true,
      preferCSSPageSize: true,
    }
    if (!outputToStdout) {
     pdfOptions.path = outputFile
    }
    let pdfWidth = doc.getAttributes()['pdf-width']
    if (pdfWidth) {
      pdfOptions.width = pdfWidth
    }
    let pdfHeight = doc.getAttributes()['pdf-height']
    if (pdfHeight) {
      pdfOptions.height = pdfHeight
    }
    let format = doc.getAttributes()['pdf-format']
    if (format) {
      pdfOptions.format = format // Paper format. If set, takes priority over width or height options. Defaults to 'Letter'.
    }
    const pdf = await page.pdf(pdfOptions)
    if (outputToStdout) {
      console.log(pdf.toString())
    }
  } finally {
    try {
      await browser.close()
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
