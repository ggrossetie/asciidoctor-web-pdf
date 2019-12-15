/* global it, describe, before, after */
const fs = require('fs')
const { PDFDocument, PDFName, PDFDict } = require('pdf-lib')
const chai = require('chai')
const rimraf = require('rimraf')
const ospath = require('path')
const expect = chai.expect
const dirtyChai = require('dirty-chai')
chai.use(dirtyChai)
require('./helper.js')(chai)

const asciidoctor = require('@asciidoctor/core')()
const converter = require('../lib/converter.js')
const templates = require('../lib/document/templates.js')
converter.registerTemplateConverter(asciidoctor, templates)

describe('PDF converter', function () {
  // launching an headless browser (especially on Travis) can take several tens of seconds
  this.timeout(30000)

  before(() => {
    const outputDir = ospath.join(__dirname, 'output')
    rimraf.sync(outputDir)
    fs.mkdirSync(outputDir)
  })

  after(function () {
    // clean the output directory if there's no failed tests (and if the DEBUG environment variable is absent).
    const failedTests = this.test.parent.tests.filter(t => t.state === 'failed')
    if (failedTests.length === 0 && typeof process.env.DEBUG === 'undefined') {
      const outputDir = ospath.join(__dirname, 'output')
      rimraf.sync(outputDir)
      fs.mkdirSync(outputDir)
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

  const decodePDFHexStringValue = (value) => {
    // remove byte order mark 0xfeff
    value = value.substr(4, value.length)
    const size = 4
    const numChunks = Math.ceil(value.length / size)
    let buff = ''
    for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
      const chunk = value.substr(o, size)
      buff += String.fromCodePoint(parseInt(chunk, 16))
    }
    return buff
  }

  const convert = async (inputFile, outputFile, options) => {
    const opts = options || {}
    opts.to_file = outputFile
    await converter.convert(asciidoctor, inputFile, opts, false)
    return PDFDocument.load(fs.readFileSync(outputFile))
  }

  it('should not encode HTML entity in the PDF outline', async () => {
    const options = { attributes: { toc: 'macro' } }
    const pdfDoc = await convert(`${__dirname}/fixtures/sections.adoc`, `${__dirname}/output/sections-toc-absent.pdf`, options)
    const refs = getOutlineRefs(pdfDoc)
    expect(refs.length).to.equal(9)
    expect(refs[2].get(PDFName.of('Dest')).encodedName).to.equal('/_section_2_black_white')
    expect(decodePDFHexStringValue(refs[2].get(PDFName.of('Title')).value)).to.equal('Section 2: Black & White')
    expect(refs[5].get(PDFName.of('Dest')).encodedName).to.equal('/_section_3_typographic_quotes')
    expect(decodePDFHexStringValue(refs[5].get(PDFName.of('Title')).value)).to.equal('Section 3: “Typographic quotes”')
    expect(decodePDFHexStringValue(refs[7].get(PDFName.of('Title')).value)).to.equal('Section 4: Asterisk hex * and decimal *')
  })

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

  it('should be able to set background color of title page', async () => {
    const opts = {}
    const outputFile = `${__dirname}/output/title-page-background-color.pdf`
    opts.to_file = outputFile
    opts.attributes = { stylesheet: `${__dirname}/../css/asciidoctor.css;${__dirname}/../css/document.css;${__dirname}/../css/features/book.css;${__dirname}/fixtures/black-title-page.css` }
    await converter.convert(asciidoctor, `${__dirname}/fixtures/title-page.adoc`, opts, false)
    expect(outputFile).to.be.visuallyIdentical('title-page-background-color.pdf')
  })
})
