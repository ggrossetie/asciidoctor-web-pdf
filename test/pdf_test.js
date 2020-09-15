/* global it, describe, before, after, beforeEach, afterEach */
const fs = require('fs')
const { PDFDocument, PDFName, PDFDict } = require('pdf-lib')
const chai = require('chai')
const sinon = require('sinon')
const rimraf = require('rimraf')
const ospath = require('path')
const expect = chai.expect
const dirtyChai = require('dirty-chai')
chai.use(dirtyChai)
require('./helper.js')(chai)

const asciidoctor = require('@asciidoctor/core')()
const converter = require('../lib/converter.js')
const { templates } = require('../lib/document/document-converter')
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
    await converter.convert(asciidoctor, { path: inputFile }, opts, false)
    return PDFDocument.load(fs.readFileSync(outputFile))
  }

  const shouldBeVisuallyIdentical = async (inputBaseFileName, attributes, outputBaseFileName) => {
    if (typeof outputBaseFileName === 'undefined') {
      outputBaseFileName = inputBaseFileName
    }
    const opts = {}
    const outputFile = `${__dirname}/output/${outputBaseFileName}.pdf`
    opts.attributes = attributes || {}
    opts.attributes.reproducible = ''
    opts.to_file = outputFile
    await converter.convert(asciidoctor, { path: `${__dirname}/fixtures/${inputBaseFileName}.adoc` }, opts, false)
    expect(outputFile).to.be.visuallyIdentical(`${outputBaseFileName}.pdf`)
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

  describe('PDF Outline', () => {
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

  describe('Page break', () => {
    const scenarios = [
      {
        doctype: 'book',
        preamble: true,
        section: true,
        toc: 'preamble',
        'title-page-attribute': false,
        'expected-page-number': 4
      },
      {
        doctype: 'book',
        preamble: true,
        section: true,
        toc: 'auto',
        'title-page-attribute': false,
        'expected-page-number': 4
      },
      {
        doctype: 'book',
        preamble: false,
        section: false,
        toc: false,
        'title-page-attribute': false,
        'expected-page-number': 1
      },
      {
        doctype: 'book',
        preamble: false,
        section: true,
        toc: 'auto',
        'title-page-attribute': false,
        'expected-page-number': 3
      },
      {
        doctype: 'book',
        preamble: false,
        section: true,
        toc: false,
        'title-page-attribute': false,
        'expected-page-number': 2
      },
      {
        doctype: 'book',
        preamble: true,
        section: true,
        toc: false,
        'title-page-attribute': false,
        'expected-page-number': 3
      },
      {
        doctype: 'article',
        preamble: true,
        section: true,
        toc: 'preamble',
        'title-page-attribute': false,
        'expected-page-number': 1
      },
      {
        doctype: 'article',
        preamble: true,
        section: true,
        toc: 'auto',
        'title-page-attribute': false,
        'expected-page-number': 1
      },
      {
        doctype: 'article',
        preamble: false,
        section: false,
        toc: false,
        'title-page-attribute': false,
        'expected-page-number': 1
      },
      {
        doctype: 'article',
        preamble: false,
        section: true,
        toc: 'auto',
        'title-page-attribute': false,
        'expected-page-number': 1
      },
      {
        doctype: 'article',
        preamble: false,
        section: true,
        toc: false,
        'title-page-attribute': false,
        'expected-page-number': 1
      },
      {
        doctype: 'article',
        preamble: true,
        section: true,
        toc: false,
        'title-page-attribute': false,
        'expected-page-number': 1
      },
      {
        doctype: 'article',
        preamble: true,
        section: true,
        toc: 'preamble',
        'title-page-attribute': true,
        'expected-page-number': 3
      },
      {
        doctype: 'article',
        preamble: true,
        section: true,
        toc: 'auto',
        'title-page-attribute': true,
        'expected-page-number': 3
      },
      // disabled from now until https://gitlab.pagedmedia.org/tools/pagedjs/issues/164 is fixed.
      // currently, paged.js will produce an empty page.
      /*
      {
        doctype: 'article',
        preamble: false,
        section: false,
        toc: false,
        'title-page-attribute': true,
        'expected-page-number': 1
      },
       */
      {
        doctype: 'article',
        preamble: false,
        section: true,
        toc: 'auto',
        'title-page-attribute': true,
        'expected-page-number': 3
      },
      {
        doctype: 'article',
        preamble: false,
        section: true,
        toc: false,
        'title-page-attribute': true,
        'expected-page-number': 2
      },
      {
        doctype: 'article',
        preamble: true,
        section: true,
        toc: false,
        'title-page-attribute': true,
        'expected-page-number': 2
      }
    ]
    for (const scenario of scenarios) {
      const features = []
      features.push(`type is ${scenario.doctype}`)
      if (scenario.preamble) {
        features.push('has preamble')
      }
      if (scenario.section) {
        features.push('has section')
      }
      if (scenario.toc !== false) {
        features.push(`has TOC ${scenario.toc}`)
      }
      if (scenario['title-page-attribute']) {
        features.push('has :title-page: attribute')
      }
      let featuresDescription
      if (features.length > 1) {
        featuresDescription = ` ${features.slice(0, -1).join(', ')} and ${features.slice(-1)}`
      } else {
        featuresDescription = ` ${features.join(', ')}`
      }
      it(`should break pages accordingly when the document${featuresDescription}`, async () => {
        const options = {}
        options.attributes = {}
        options.attributes.reproducible = ''
        if (scenario['title-page-attribute']) {
          options.attributes['title-page'] = ''
        }
        if (scenario.toc !== false) {
          options.attributes.toc = scenario.toc
        }
        options.doctype = scenario.doctype
        const outputFileName = `page-break-${scenario.doctype}-preamble_${scenario.preamble}-section_${scenario.section}-toc_${scenario.toc}-title-page-attribute_${scenario['title-page-attribute']}.pdf`
        const outputFile = `${__dirname}/output/${outputFileName}`
        let inputFileName
        if (scenario.preamble && scenario.section) {
          inputFileName = 'document-with-title-preamble-and-section.adoc'
        } else if (scenario.section) {
          inputFileName = 'document-with-title-and-section.adoc'
        } else {
          inputFileName = 'document-with-only-title.adoc'
        }
        const inputFile = `${__dirname}/fixtures/${inputFileName}`

        const pdfDoc = await convert(inputFile, outputFile, options)
        expect(pdfDoc.getPages().length).to.equal(scenario['expected-page-number'])
        expect(outputFile).to.be.visuallyIdentical(outputFileName)
      })
    }
  })

  it('should be able to set background color of title page', async () => {
    const attributes = {}
    attributes.stylesheet = `${__dirname}/../css/asciidoctor.css,${__dirname}/../css/document.css,${__dirname}/../css/features/book.css,${__dirname}/fixtures/black-title-page.css`
    await shouldBeVisuallyIdentical('title-page', attributes, 'title-page-background-color')
  })

  it('should repeat column group, caption and table header', async () => {
    await shouldBeVisuallyIdentical('repeat-table-elements')
  })

  it('should render mathematical expressions using MathJax.js', async () => {
    await shouldBeVisuallyIdentical('document-with-stem')
  })

  it('should enable syntax highlighting if source highlighter is set', async () => {
    const attributes = {}
    attributes['source-highlighter'] = 'highlight.js'
    await shouldBeVisuallyIdentical('document-with-left-toc', attributes)
  })

  it('should be put the Table Of Contents on the page even when :toc: left', async () => {
    await shouldBeVisuallyIdentical('document-with-left-toc')
  })

  it('should create a counter and increment it accordingly', async () => {
    await shouldBeVisuallyIdentical('document-with-counters')
  })

  describe('Timeout', () => {
    beforeEach(function () {
      sinon.spy(console, 'error')
    })

    afterEach(function () {
      console.error.restore()
    })

    it('should timeout while navigating', async () => {
      try {
        process.env.PUPPETEER_NAVIGATION_TIMEOUT = 1
        delete require.cache[require.resolve('../lib/converter.js')]
        const converter = require('../lib/converter.js')
        await converter.convert(asciidoctor, { path: `${__dirname}/fixtures/title-page.adoc` }, {}, false)
        const call = console.error.getCall(0)
        expect(call).to.have.property('firstArg')
        expect(call.firstArg).to.equal('Unable to generate the PDF - Error: TimeoutError: Navigation timeout of 1 ms exceeded')
      } finally {
        delete process.env.PUPPETEER_NAVIGATION_TIMEOUT
      }
    })
  })
})
