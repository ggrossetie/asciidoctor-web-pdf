import assert from 'node:assert/strict'
import fs from 'node:fs'
import ospath from 'node:path'
import {
  after,
  afterEach,
  before,
  beforeEach,
  describe,
  it,
  mock,
} from 'node:test'
import { PDFArray, PDFDict, PDFDocument, PDFName } from 'pdf-lib'
import Browser from '../lib/browser.js'
import * as converter from '../lib/converter.js'
import { templates } from '../lib/document/document-converter.js'
import * as helper from './helper.js'

converter.registerTemplateConverter(templates)

const __dirname = import.meta.dirname
const fixturesPath = (...paths) => ospath.join(__dirname, 'fixtures', ...paths)
const outputPath = (...paths) => ospath.join(__dirname, 'output', ...paths)
const cssPath = (...paths) => ospath.join(__dirname, '..', 'css', ...paths)

function assertVisuallyIdentical(outputFile, reference) {
  const pixelDiff = helper.toVisuallyMatch(reference, outputFile)
  const relPath = ospath.relative(__dirname, outputFile)
  assert.strictEqual(
    pixelDiff,
    0,
    `expected ${relPath} to be visually identical to reference/${reference} but has ${pixelDiff} pixels difference`,
  )
}

describe('PDF converter', () => {
  before(() => {
    const outputDir = ospath.join(__dirname, 'output')
    fs.rmSync(outputDir, { recursive: true, force: true })
    fs.mkdirSync(outputDir)
    fs.writeFileSync(ospath.join(outputDir, '.gitkeep'), '')
  })

  after(() => {
    if (typeof process.env.DEBUG === 'undefined') {
      const outputDir = ospath.join(__dirname, 'output')
      fs.rmSync(outputDir, { recursive: true, force: true })
      fs.mkdirSync(outputDir)
      fs.writeFileSync(ospath.join(outputDir, '.gitkeep'), '')
    }
  })

  const getOutlineRefs = (pdfDoc) => {
    const values = pdfDoc.context
      .lookup(pdfDoc.catalog.get(PDFName.of('Outlines')))
      .context.indirectObjects.values()
    const dicts = []
    for (const v of values) {
      if (v instanceof PDFDict) {
        dicts.push(v.dict)
      }
    }
    return dicts.filter((d) =>
      Array.from(d.keys()).includes(PDFName.of('Dest')),
    )
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
    await converter.convert({ path: inputFile }, opts, false)
    return PDFDocument.load(fs.readFileSync(outputFile))
  }

  const shouldBeVisuallyIdentical = async (
    inputBaseFileName,
    attributes,
    outputBaseFileName,
  ) => {
    if (typeof outputBaseFileName === 'undefined') {
      outputBaseFileName = inputBaseFileName
    }
    const opts = {}
    const outputFile = outputPath(`${outputBaseFileName}.pdf`)
    opts.attributes = attributes || {}
    opts.attributes.reproducible = ''
    opts.to_file = outputFile
    await converter.convert(
      { path: fixturesPath(`${inputBaseFileName}.adoc`) },
      opts,
      false,
    )
    assertVisuallyIdentical(outputFile, `${outputBaseFileName}.pdf`)
  }

  it('should not encode HTML entity in the PDF outline', async () => {
    const options = { attributes: { toc: 'macro' } }
    const pdfDoc = await convert(
      fixturesPath('sections.adoc'),
      outputPath('sections-toc-absent.pdf'),
      options,
    )
    const refs = getOutlineRefs(pdfDoc)
    assert.strictEqual(refs.length, 9)
    assert.ok(refs[2].get(PDFName.of('Dest')) instanceof PDFArray)
    assert.strictEqual(
      decodePDFHexStringValue(refs[2].get(PDFName.of('Title')).value),
      'Section 2: Black & White',
    )
    assert.ok(refs[5].get(PDFName.of('Dest')) instanceof PDFArray)
    assert.strictEqual(
      decodePDFHexStringValue(refs[5].get(PDFName.of('Title')).value),
      'Section 3: “Typographic quotes”',
    )
    assert.strictEqual(
      decodePDFHexStringValue(refs[7].get(PDFName.of('Title')).value),
      'Section 4: Asterisk hex * and decimal *',
    )
  })

  describe('PDF Outline', () => {
    it('should generate a PDF outline even if the TOC is absent from the output', async () => {
      const options = { attributes: { toc: 'macro' } }
      const pdfDoc = await convert(
        fixturesPath('sections.adoc'),
        outputPath('sections-toc-absent.pdf'),
        options,
      )
      const refs = getOutlineRefs(pdfDoc)
      assert.strictEqual(refs.length, 9)
      assert.ok(refs[0].get(PDFName.of('Dest')) instanceof PDFArray)
    })

    it('should generate a PDF outline even if the TOC is not enabled', async () => {
      const pdfDoc = await convert(
        fixturesPath('sections.adoc'),
        outputPath('sections-toc-disabled.pdf'),
      )
      const refs = getOutlineRefs(pdfDoc)
      assert.strictEqual(refs.length, 9)
      assert.ok(refs[0].get(PDFName.of('Dest')) instanceof PDFArray)
    })

    it('should honor toclevels 1 when generating a PDF outline', async () => {
      const options = { attributes: { toclevels: 1 } }
      const pdfDoc = await convert(
        fixturesPath('sections.adoc'),
        outputPath('sections-toclevels-1.pdf'),
        options,
      )
      const refs = getOutlineRefs(pdfDoc)
      assert.strictEqual(refs.length, 4)
      assert.ok(refs[0].get(PDFName.of('Dest')) instanceof PDFArray)
    })

    it('should honor toclevels 3 when generating a PDF outline', async () => {
      const options = { attributes: { toclevels: 3 } }
      const pdfDoc = await convert(
        fixturesPath('sections.adoc'),
        outputPath('sections-toclevels-1.pdf'),
        options,
      )
      const refs = getOutlineRefs(pdfDoc)
      assert.strictEqual(refs.length, 11)
      assert.ok(refs[0].get(PDFName.of('Dest')) instanceof PDFArray)
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
        'expected-page-number': 4,
      },
      {
        doctype: 'book',
        preamble: true,
        section: true,
        toc: 'auto',
        'title-page-attribute': false,
        'expected-page-number': 4,
      },
      {
        doctype: 'book',
        preamble: false,
        section: false,
        toc: false,
        'title-page-attribute': false,
        'expected-page-number': 1,
      },
      {
        doctype: 'book',
        preamble: false,
        section: true,
        toc: 'auto',
        'title-page-attribute': false,
        'expected-page-number': 3,
      },
      {
        doctype: 'book',
        preamble: false,
        section: true,
        toc: false,
        'title-page-attribute': false,
        'expected-page-number': 2,
      },
      {
        doctype: 'book',
        preamble: true,
        section: true,
        toc: false,
        'title-page-attribute': false,
        'expected-page-number': 3,
      },
      {
        doctype: 'article',
        preamble: true,
        section: true,
        toc: 'preamble',
        'title-page-attribute': false,
        'expected-page-number': 1,
      },
      {
        doctype: 'article',
        preamble: true,
        section: true,
        toc: 'auto',
        'title-page-attribute': false,
        'expected-page-number': 1,
      },
      {
        doctype: 'article',
        preamble: false,
        section: false,
        toc: false,
        'title-page-attribute': false,
        'expected-page-number': 1,
      },
      {
        doctype: 'article',
        preamble: false,
        section: true,
        toc: 'auto',
        'title-page-attribute': false,
        'expected-page-number': 1,
      },
      {
        doctype: 'article',
        preamble: false,
        section: true,
        toc: false,
        'title-page-attribute': false,
        'expected-page-number': 1,
      },
      {
        doctype: 'article',
        preamble: true,
        section: true,
        toc: false,
        'title-page-attribute': false,
        'expected-page-number': 1,
      },
      {
        doctype: 'article',
        preamble: true,
        section: true,
        toc: 'preamble',
        'title-page-attribute': true,
        'expected-page-number': 3,
      },
      {
        doctype: 'article',
        preamble: true,
        section: true,
        toc: 'auto',
        'title-page-attribute': true,
        'expected-page-number': 3,
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
        'expected-page-number': 3,
      },
      {
        doctype: 'article',
        preamble: false,
        section: true,
        toc: false,
        'title-page-attribute': true,
        'expected-page-number': 2,
      },
      {
        doctype: 'article',
        preamble: true,
        section: true,
        toc: false,
        'title-page-attribute': true,
        'expected-page-number': 2,
      },
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
        const outputFile = outputPath(outputFileName)
        let inputFileName
        if (scenario.preamble && scenario.section) {
          inputFileName = 'document-with-title-preamble-and-section.adoc'
        } else if (scenario.section) {
          inputFileName = 'document-with-title-and-section.adoc'
        } else {
          inputFileName = 'document-with-only-title.adoc'
        }
        const inputFile = fixturesPath(inputFileName)

        const pdfDoc = await convert(inputFile, outputFile, options)
        assert.strictEqual(
          pdfDoc.getPages().length,
          scenario['expected-page-number'],
        )
        assertVisuallyIdentical(outputFile, outputFileName)
      })
    }
  })

  it('should be able to set background color of title page', async () => {
    const attributes = {}
    attributes.stylesheet = `${cssPath('asciidoctor.css')},${cssPath('document.css')},${cssPath('features', 'book.css')},${fixturesPath('black-title-page.css')}`
    await shouldBeVisuallyIdentical(
      'title-page',
      attributes,
      'title-page-background-color',
    )
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

  it('should display number or bullet on lists', async () => {
    await shouldBeVisuallyIdentical('list')
  })

  it('should remove orphaned table headers', async () => {
    await shouldBeVisuallyIdentical('orphaned-table-header')
  })

  describe('Page splitting (regressions from the Paged.js era)', () => {
    it('should not lose table rows when a table spans multiple pages', async () => {
      const outputFile = outputPath('table-spanning-pages.pdf')
      await converter.convert(
        { path: fixturesPath('table-spanning-pages.adoc') },
        { to_file: outputFile },
        false,
      )
      const text = helper.extractText(outputFile)
      for (const i of [1, 53, 54, 55, 56, 119, 120]) {
        assert.ok(
          text.includes(`row-${i}-marker`),
          `expected row-${i}-marker to be present in the extracted text`,
        )
      }
    })

    it('should keep sequential numbering when an ordered list spans multiple pages', async () => {
      const outputFile = outputPath('ordered-list-numbering-across-pages.pdf')
      const pdfDoc = await convert(
        fixturesPath('ordered-list-numbering-across-pages.adoc'),
        outputFile,
      )
      assert.strictEqual(
        pdfDoc.getPages().length,
        2,
        'expected the ordered list to span exactly 2 pages',
      )
      const text = helper.extractText(outputFile)
      for (let i = 1; i <= 30; i++) {
        assert.ok(
          text.includes(`${i}. item-${i}-marker`),
          `expected item ${i} to be numbered "${i}." instead of restarting the counter`,
        )
      }
    })

    it('should render the TOC dot leader when the TOC is placed manually with the toc::[] macro', async () => {
      const outputFile = outputPath('toc-macro-dot-leader.pdf')
      await converter.convert(
        { path: fixturesPath('toc-macro-dot-leader.adoc') },
        { to_file: outputFile },
        false,
      )
      const lines = helper
        .extractText(outputFile)
        .split('\n')
        .map((line) => line.replace(/\s+/g, ''))
      for (const title of ['Preface', 'SectionOne', 'SectionTwo']) {
        assert.ok(
          lines.some((line) => new RegExp(`^${title}\\.{10,}\\d+$`).test(line)),
          `expected a dot leader between "${title}" and its page number in the TOC`,
        )
      }
    })

    it('should keep a consistent number of rows per page when a table with images spans multiple pages', async () => {
      const outputFile = outputPath('table-with-images-spanning-pages.pdf')
      const pdfDoc = await convert(
        fixturesPath('table-with-images-spanning-pages.adoc'),
        outputFile,
      )
      assert.strictEqual(
        pdfDoc.getPages().length,
        2,
        'expected the table to span exactly 2 pages',
      )
      const text = helper.extractText(outputFile)
      for (let i = 1; i <= 24; i++) {
        assert.ok(
          text.includes(`row-${i}-marker`),
          `expected row-${i}-marker to be present in the extracted text`,
        )
      }
    })

    it('should keep the bullet marker when a list item spans a page break', async () => {
      const outputFile = outputPath('list-split-across-pages.pdf')
      const pdfDoc = await convert(
        fixturesPath('list-split-across-pages.adoc'),
        outputFile,
      )
      assert.ok(
        pdfDoc.getPages().length > 1,
        'expected the giant list item to force a page break',
      )
      const text = helper.extractText(outputFile)
      assert.ok(text.includes('START-MARKER-GIANT-ITEM'))
      assert.ok(text.includes('END-MARKER-GIANT-ITEM'))
      assert.ok(text.includes('Short item after the giant one'))
    })

    it('should not drop content around highlighted code blocks near a page break', async () => {
      const outputFile = outputPath('highlighted-code-near-page-break.pdf')
      await converter.convert(
        { path: fixturesPath('highlighted-code-near-page-break.adoc') },
        { to_file: outputFile },
        false,
      )
      const text = helper.extractText(outputFile)
      assert.ok(text.includes('FINAL-MARKER-PARAGRAPH-CANARY'))
    })

    it('should honor a custom @page size and margins when :stem: is enabled', async () => {
      const attributes = {
        stylesheet: `${cssPath('asciidoctor.css')},${cssPath('document.css')},${fixturesPath('stem-custom-page-size.css')}`,
      }
      const outputFile = outputPath('stem-custom-page-size.pdf')
      const pdfDoc = await convert(
        fixturesPath('stem-custom-page-size.adoc'),
        outputFile,
        { attributes },
      )
      const { width, height } = pdfDoc.getPage(0).getSize()
      // 148mm x 210mm in points, with a small tolerance
      assert.ok(
        Math.abs(width - 419.53) < 1,
        `expected width ~419.53, got ${width}`,
      )
      assert.ok(
        Math.abs(height - 595.28) < 1,
        `expected height ~595.28, got ${height}`,
      )
    })
  })

  describe('PDF outline destinations', () => {
    let warnMock
    let errorMock

    beforeEach(() => {
      warnMock = mock.method(console, 'warn')
      errorMock = mock.method(console, 'error')
    })

    afterEach(() => {
      warnMock.mock.restore()
      errorMock.mock.restore()
    })

    it('should resolve destinations for section titles with diacritics', async () => {
      const pdfDoc = await convert(
        fixturesPath('anchor-with-diacritics.adoc'),
        outputPath('anchor-with-diacritics.pdf'),
      )
      const titledRefs = getOutlineRefs(pdfDoc).filter((ref) =>
        ref.has(PDFName.of('Title')),
      )
      const titles = titledRefs.map((ref) =>
        decodePDFHexStringValue(ref.get(PDFName.of('Title')).value),
      )
      assert.deepStrictEqual(titles, ['Überblick', 'Königsstraße', 'Übersicht'])
      const messages = [...warnMock.mock.calls, ...errorMock.mock.calls].map(
        (call) => String(call.arguments[0]),
      )
      assert.ok(
        !messages.some((message) =>
          message.includes('Unable to find destination'),
        ),
        `expected no "Unable to find destination" warning, got: ${messages.join('; ')}`,
      )
    })
  })

  describe('Known issues', () => {
    // https://github.com/ggrossetie/asciidoctor-web-pdf/issues/726
    // A listing block that spans a page break loses the indentation of its
    // whitespace-only text nodes when the DOM is split/cloned across pages.
    // Un-skip once the underlying page-splitting behavior preserves them.
    it('should preserve indentation in a code block split across a page break', {
      skip: 'https://github.com/ggrossetie/asciidoctor-web-pdf/issues/726',
    }, async () => {
      const outputFile = outputPath('source-code-split-across-pages.pdf')
      await converter.convert(
        { path: fixturesPath('source-code-split-across-pages.adoc') },
        { to_file: outputFile },
        false,
      )
      const text = helper.extractText(outputFile)
      assert.ok(
        text.includes('    "indent_check": "    four spaces before this"'),
        'expected indentation to be preserved after the page break',
      )
    })
  })

  describe('Timeout', () => {
    let errorMock

    beforeEach(() => {
      errorMock = mock.method(console, 'error')
    })

    afterEach(() => {
      errorMock.mock.restore()
    })

    it('should timeout while navigating', async () => {
      const timeoutError = new Error('Navigation timeout of 1 ms exceeded')
      timeoutError.name = 'TimeoutError'
      const gotoMock = mock.method(Browser.prototype, 'goto', async () => {
        throw timeoutError
      })
      const originalExitCode = process.exitCode
      process.exitCode = undefined
      try {
        await converter.convert(
          { path: fixturesPath('title-page.adoc') },
          {},
          false,
        )
        assert.ok(errorMock.mock.calls.length > 0)
        assert.strictEqual(
          errorMock.mock.calls[0].arguments[0],
          'Unable to generate the PDF - Error: TimeoutError: Navigation timeout of 1 ms exceeded',
        )
        assert.strictEqual(
          process.exitCode,
          1,
          'expected the process exit code to be set to 1 when a conversion fails',
        )
      } finally {
        gotoMock.mock.restore()
        process.exitCode = originalExitCode
      }
    })

    it('should not set a non-zero exit code while watching', async () => {
      const timeoutError = new Error('Navigation timeout of 1 ms exceeded')
      timeoutError.name = 'TimeoutError'
      const gotoMock = mock.method(Browser.prototype, 'goto', async () => {
        throw timeoutError
      })
      const originalExitCode = process.exitCode
      process.exitCode = undefined
      try {
        await converter.convert(
          { path: fixturesPath('title-page.adoc') },
          {},
          false,
          true, // watch
        )
        assert.strictEqual(
          process.exitCode,
          undefined,
          'expected the exit code to be left untouched while in watch mode',
        )
      } finally {
        gotoMock.mock.restore()
        process.exitCode = originalExitCode
      }
    })
  })
})
