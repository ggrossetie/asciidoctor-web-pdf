const asciidoctor = require('asciidoctor.js')()
require('asciidoctor.js-pug')
const util = require('util')
const fs = require('fs')
const path = require('path')
const writeFile = util.promisify(fs.writeFile)
const puppeteer = require('puppeteer')

async function convert(inputFile, options) {
  const doc = asciidoctor.loadFile(inputFile, options)
  console.log(options)
  const html = doc.convert(options)
  console.log(html)
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
    args: ['--no-sandbox', '--disable-web-security', '--allow-file-access-from-file']
  }
  const browser = await puppeteer.launch(puppeteerConfig);
  const page = await browser.newPage()
  page.on('pageerror', function (err) {
    console.log('Page error: ' + err.toString())
  }).on('error', function (err) {
    console.log('Error: ' + err.toString())
  })
  await writeFile(tempFile, html)
  //await page.goto('file://' + tempFile, {waitUntil: 'networkidle2'})
  const baseAbsolutePath = process.cwd();
  const relativeFilePath = path.relative(baseAbsolutePath, tempFile);
  const url = 'http://localhost:5000/' + relativeFilePath;
  console.log(`goto ${url}`)
  await page.goto(url, {waitUntil: 'networkidle2'})
  const pdfOptions = {
    path: outputFile,
    printBackground: true
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

module.exports = {
  convert: convert
}
