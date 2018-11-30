/* global Opal */
const util = require('util')
const {writeFile} = require('fs').promises
const path = require('path')
const puppeteer = require('puppeteer')
const asciidoctor = require('asciidoctor.js')()
const getPort = require('get-port')
const handler = require('serve-handler')
const {createServer} = require('http')

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
  const workingDir = path.dirname(inputFile)
  const inputFilenameWithoutExt = path.basename(inputFile, path.extname(inputFile))
  const outputFile = path.join(workingDir, inputFilenameWithoutExt + '.pdf')
  let tempFile;
  if (path.isAbsolute(workingDir)) {
    tempFile = path.join(workingDir, inputFilenameWithoutExt + '_temp.html')
  } else {
    tempFile = path.normalize(path.join(process.cwd(), workingDir, inputFilenameWithoutExt + '_temp.html'))
  }
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

  const [, port] = await Promise.all([
    writeFile(tempFile, html),
    getPort(),
  ])

  const baseAbsolutePath = process.cwd();
  const relativeFilePath = path.relative(baseAbsolutePath, tempFile);
  const url = `http://localhost:${port}/${relativeFilePath}`;

  return await new Promise((resolve, reject) => {
    console.log(`start server on localhost:${port}`)

    const server = createServer(handler).listen(port, async () => {
      console.log(`goto ${url}`)
      server.on('error', reject)
      page.on('error', reject)

      await page.goto(url, {waitUntil: 'networkidle2'})
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

      const output = await page.pdf(pdfOptions)
      server.close()
      resolve(output)
    })
  })
}

function getCoreVersion() {
  return asciidoctor.getCoreVersion()
}

module.exports = {
  convert: convert,
  getCoreVersion: getCoreVersion,
  registerTemplateConverter: registerTemplateConverter
}
