/* global it, describe, before, after */
const fs = require('fs')
const { PDFDocument, PDFName, PDFDict } = require('pdf-lib')
const chai = require('chai')
const expect = chai.expect
const dirtyChai = require('dirty-chai')
chai.use(dirtyChai)

const asciidoctor = require('@asciidoctor/core')()
const converter = require('../lib/converter.js')
const templates = require('../lib/document/templates.js')
converter.registerTemplateConverter(asciidoctor, templates)

describe('PDF converter', async function () {
  // launching an headless browser (especially on Travis) can take several tens of seconds
  this.timeout(30000)
  let browser

  before(async function () {
    console.time('converter.launchBrowser')
    browser = await converter.launchBrowser(false)
    console.timeEnd('converter.launchBrowser')
  })

  after(async function () {
    if (browser) {
      try {
        await browser.close()
      } catch (err) {
        console.log('Unable to close the browser - Error: ' + err.toString())
      }
    }
  })

  const getOutlineRefs = (pdfDoc) => {
    const values = pdfDoc.context.lookup(pdfDoc.catalog.get(PDFName.of('Outlines'))).context.indirectObjects.values()
    const dicts = []
    for (const v of values) {
      if (v instanceof PDFDict) {
        dicts.push(v.dict)
      }
    }
    return dicts.filter((d) => Array.from(d.keys()).includes(PDFName.of('Dest')))
  }

  const convert = async (inputFile, outputFile, options) => {
    const opts = options || {}
    opts.to_file = outputFile
    console.time('converter.convertPdf')
    await converter.convertPdf(browser, asciidoctor, inputFile, opts, false)
    console.timeEnd('converter.convertPdf')
    console.time('PDFDocument.load')
    const pdf = await PDFDocument.load(fs.readFileSync(outputFile))
    console.timeEnd('PDFDocument.load')
    return pdf
  }

  it('should generate a PDF outline even if the TOC is absent from the output', async () => {
    const options = { attributes: { toc: 'macro' } }
    const pdfDoc = await convert(`${__dirname}/fixtures/sections.adoc`, `${__dirname}/output/sections-toc-absent.pdf`, options)
    const refs = getOutlineRefs(pdfDoc)
    expect(refs.length).to.equal(9)
    expect(refs[0].get(PDFName.of('Dest')).encodedName).to.equal('/_section_1')
  })

  it('should generate a PDF outline even if the TOC is not enabled', async () => {
    const pdfDoc = await convert(`${__dirname}/fixtures/sections.adoc`, `${__dirname}/output/sections-toc-disabled.pdf`)
    const refs = getOutlineRefs(pdfDoc)
    expect(refs.length).to.equal(9)
    expect(refs[0].get(PDFName.of('Dest')).encodedName).to.equal('/_section_1')
  })

  it('should honor toclevels 1 when generating a PDF outline', async () => {
    const options = { attributes: { toclevels: 1 } }
    const pdfDoc = await convert(`${__dirname}/fixtures/sections.adoc`, `${__dirname}/output/sections-toclevels-1.pdf`, options)
    const refs = getOutlineRefs(pdfDoc)
    expect(refs.length).to.equal(4)
    expect(refs[0].get(PDFName.of('Dest')).encodedName).to.equal('/_section_1')
  })

  it('should honor toclevels 3 when generating a PDF outline', async () => {
    const options = { attributes: { toclevels: 3 } }
    const pdfDoc = await convert(`${__dirname}/fixtures/sections.adoc`, `${__dirname}/output/sections-toclevels-1.pdf`, options)
    const refs = getOutlineRefs(pdfDoc)
    expect(refs.length).to.equal(11)
    expect(refs[0].get(PDFName.of('Dest')).encodedName).to.equal('/_section_1')
  })
})
