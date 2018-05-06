const asciidoctor = require('asciidoctor.js')()
require('asciidoctor.js-pug')
const util = require('util')
const fs = require('fs')
const path = require('path')
const writeFile = util.promisify(fs.writeFile)
const puppeteer = require('puppeteer')

async function convert(inputFile, options) {
  const html = asciidoctor.convertFile(inputFile, options)
  // -a pdf-stylesdir=resources/themes -a pdf-style=basic -a pdf-fontsdir=resources/fonts
  // apply style
  // custom templates
  const workingDir = path.dirname(inputFile)
  const inputFilenameWithoutExt = path.basename(inputFile, path.extname(inputFile))
  const outputFile = path.join(workingDir, inputFilenameWithoutExt + '.pdf')
  let tempFile;
  if (path.isAbsolute(workingDir)) {
    tempFile = path.join(workingDir, inputFilenameWithoutExt + '_temp.html')
  } else {
    tempFile = path.normalize(path.join(process.cwd(), workingDir, inputFilenameWithoutExt + '_temp.html'))
  }

  console.log(outputFile)
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
    printBackground: true
  }
  return await page.pdf(pdfOptions)
}

module.exports = {
  convert: convert
}
