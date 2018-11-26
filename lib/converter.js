/* global Opal */
const util = require('util')
const fs = require('fs')
const path = require('path')
const writeFile = util.promisify(fs.writeFile)
const mkdir = util.promisify(fs.mkdir)
const puppeteer = require('puppeteer')
const asciidoctor = require('asciidoctor.js')()

function registerTemplateConverter (templates) {
  const HTML5Converter = Opal.const_get_qualified(
    Opal.const_get_qualified(
      Opal.const_get_relative(Opal, 'Asciidoctor'),
      'Converter'
    ),
    'Html5Converter'
  )
  class TemplateConverter {
    constructor () {
      this.baseConverter = HTML5Converter.$new()
      this.templates = templates;
    }

    $convert (node, transform, opts) {
      const template = this.templates[transform || node.node_name]
      if (template) {
        return template(node)
      }
      return this.baseConverter.$convert(node, transform, opts)
    }
  }
  asciidoctor.Converter.Factory.$register(new TemplateConverter(), ['html5'])
}

async function convert(inputFile, options, timings) {
  let html;
  let doc;
  if (timings) {
    const timings = asciidoctor.Timings.$new()
    const instanceOptions = Object.assign({}, options, { timings: timings })
    doc = asciidoctor.loadFile(inputFile, instanceOptions)
    html = doc.convert(instanceOptions)
    timings.$print_report(Opal.gvars.stderr, inputFile)
  } else {
    doc = asciidoctor.loadFile(inputFile, options)
    html = doc.convert(options)
  }

  let toDir = options.to_dir || path.dirname(inputFile)
  if (!path.isAbsolute(toDir)) {
    toDir = path.normalize(path.join(process.cwd(), toDir))
  }
  await ensureExists(toDir)

  const inputFilenameWithoutExt = path.basename(inputFile, path.extname(inputFile))
  const outputFile = path.join(toDir, inputFilenameWithoutExt + '.pdf')
  const tempFile = path.join(toDir, inputFilenameWithoutExt + '_temp.html')
  const puppeteerConfig = {
    headless: true,
    args: ['--no-sandbox']
  }
  const browser = await puppeteer.launch(puppeteerConfig);
  const page = await browser.newPage()
  page.on('pageerror', function (err) {
    console.log('Page error: ' + err.toString())
  }).on('error', function (err) {
    console.log('Error: ' + err.toString())
  })
  await writeFile(tempFile, html)
  await page.goto('file://' + tempFile, {waitUntil: 'networkidle2'})
  const pdfOptions = {
    path: outputFile,
    printBackground: true,
    preferCSSPageSize: true,
  }
  let pdfWidth = doc.getAttributes()['pdf-width']
  if (pdfWidth) {
    pdfOptions.width = pdfWidth
  }
  let pdfHeight = doc.getAttributes()['pdf-height']
  if (pdfHeight) {
    pdfOptions.height = pdfHeight
  }
  let pdfSize = doc.getAttributes()['pdf-size']
  if (pdfSize) {
    pdfOptions.size = pdfSize
  }
  return await page.pdf(pdfOptions)
}

async function ensureExists(path) {
  if (!fs.existsSync(path)) {
    await mkdir(path, {recursive: true})
  }
}

function getCoreVersion() {
  return asciidoctor.getCoreVersion()
}

module.exports = {
  convert: convert,
  getCoreVersion: getCoreVersion,
  registerTemplateConverter: registerTemplateConverter
}
