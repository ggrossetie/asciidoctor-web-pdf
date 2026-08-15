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
import DocumentPDFConverter, {
  templates,
} from '../lib/document/document-converter.js'
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
        'expected-page-number': 4,
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

    // https://github.com/ggrossetie/asciidoctor-web-pdf/issues/726
    // Paged.js's DOM cloning stripped whitespace-only text nodes when
    // splitting a listing block across pages. Vivliostyle doesn't clone the
    // DOM that way, so this no longer reproduces - confirmed here by
    // comparing the exact glyph x-position (not an approximate space count)
    // of every occurrence across the page break.
    it('should preserve indentation in a code block split across a page break', async () => {
      const outputFile = outputPath('source-code-split-across-pages.pdf')
      await converter.convert(
        { path: fixturesPath('source-code-split-across-pages.adoc') },
        { to_file: outputFile },
        false,
      )
      const words = helper.extractWordBoxes(outputFile)
      const indentChecks = words.filter(
        (word) => word.text === '"indent_check":',
      )
      assert.strictEqual(
        indentChecks.length,
        69,
        `expected 69 "indent_check" occurrences, got ${indentChecks.length}`,
      )
      const distinctPositions = [
        ...new Set(indentChecks.map((word) => word.xMin)),
      ]
      assert.strictEqual(
        distinctPositions.length,
        1,
        `expected the same horizontal position for every occurrence, got: ${distinctPositions.join(', ')}`,
      )
    })

    // https://github.com/ggrossetie/asciidoctor-web-pdf/issues/374
    it('should not split a sidebar block across a page break', async () => {
      const outputFile = outputPath('sidebar-avoid-page-break.pdf')
      await converter.convert(
        { path: fixturesPath('sidebar-avoid-page-break.adoc') },
        { to_file: outputFile },
        false,
      )
      const pages = helper.extractText(outputFile).split('\f')
      const pageOf = (marker) =>
        pages.findIndex((page) => page.includes(marker))
      const startPage = pageOf('START-SIDEBAR-MARKER')
      const endPage = pageOf('END-SIDEBAR-MARKER')
      assert.ok(startPage >= 0 && endPage >= 0)
      assert.strictEqual(
        startPage,
        endPage,
        `expected the sidebar block to stay on a single page, got start on page ${startPage} and end on page ${endPage}`,
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

  describe('Known issues (bucket D backlog triage)', () => {
    // https://github.com/ggrossetie/asciidoctor-web-pdf/issues/164
    it('should wrap a long unbroken word instead of letting it overflow the page', async () => {
      const outputFile = outputPath('table-cell-long-word.pdf')
      const pdfDoc = await convert(
        fixturesPath('table-cell-long-word.adoc'),
        outputFile,
      )
      const { width: pageWidth } = pdfDoc.getPage(0).getSize()
      const overflowing = helper
        .extractWordBoxes(outputFile)
        .filter((word) => word.xMax > pageWidth)
      assert.deepStrictEqual(
        overflowing,
        [],
        `expected no word to extend past the page width (${pageWidth}pt), got: ${overflowing.map((w) => `"${w.text}" (xMax=${w.xMax})`).join(', ')}`,
      )
    })

    // https://github.com/ggrossetie/asciidoctor-web-pdf/issues/241
    it('should render collapsible block content even without the %open option', async () => {
      const outputFile = outputPath('collapsible-block.pdf')
      await converter.convert(
        { path: fixturesPath('collapsible-block.adoc') },
        { to_file: outputFile },
        false,
      )
      const text = helper.extractText(outputFile)
      assert.ok(
        text.includes('COLLAPSIBLE-CONTENT-MARKER'),
        'expected the collapsible content to be visible in the PDF even when collapsed',
      )
    })

    // https://github.com/ggrossetie/asciidoctor-web-pdf/issues/492
    it('should place the ToC after the preamble for the book doctype when toc-placement is preamble', async () => {
      const outputFile = outputPath('toc-preamble-book-doctype.pdf')
      await converter.convert(
        { path: fixturesPath('toc-preamble-book-doctype.adoc') },
        { to_file: outputFile },
        false,
      )
      const text = helper.extractText(outputFile)
      const preambleIndex = text.indexOf('PREAMBLE-MARKER-TEXT')
      const tocIndex = text.indexOf('Thing One') // first occurrence is the ToC entry
      const sectionIndex = text.indexOf('SECTION-ONE-MARKER')
      assert.ok(
        preambleIndex >= 0 && tocIndex >= 0 && sectionIndex >= 0,
        'expected to find the preamble, ToC and section markers in the output',
      )
      assert.ok(
        preambleIndex < tocIndex && tocIndex < sectionIndex,
        'expected the ToC to appear after the preamble and before the first section',
      )
    })

    // https://github.com/ggrossetie/asciidoctor-web-pdf/issues/547
    it.skip('should not render the document title when showtitle is unset', async () => {
      const outputFile = outputPath('showtitle-disabled.pdf')
      await converter.convert(
        { path: fixturesPath('showtitle-disabled.adoc') },
        { to_file: outputFile },
        false,
      )
      const text = helper.extractText(outputFile)
      assert.ok(
        !text.includes('Deployment Instructions'),
        'expected the document title to be hidden when :showtitle!: is set',
      )
      assert.ok(text.includes('PARAGRAPH-MARKER-CONTENT'))
    })

    // https://github.com/ggrossetie/asciidoctor-web-pdf/issues/664
    it('should not duplicate a footnote that is referenced more than once', async () => {
      const outputFile = outputPath('footnotes-duplicate.pdf')
      await converter.convert(
        { path: fixturesPath('footnotes.adoc') },
        { to_file: outputFile },
        false,
      )
      const text = helper.extractText(outputFile)
      const occurrences = text.split('Opinions are my own.').length - 1
      assert.strictEqual(
        occurrences,
        1,
        `expected the "disclaimer" footnote to be defined once, found it ${occurrences} times`,
      )
    })

    // https://github.com/ggrossetie/asciidoctor-web-pdf/issues/676
    it('should render the table frame border when grid is set to rows', async () => {
      const outputFile = outputPath('table-frame-with-grid-rows.pdf')
      await converter.convert(
        { path: fixturesPath('table-frame-with-grid-rows.adoc') },
        { to_file: outputFile },
        false,
      )
      const header = helper
        .extractWordBoxes(outputFile)
        .filter((word) => word.text === 'Name' || word.text === 'Description')
      const xFrom = Math.min(...header.map((word) => word.xMin)) - 4
      const xTo = Math.max(...header.map((word) => word.xMax)) + 4
      const yTop = Math.min(...header.map((word) => word.yMin))
      const png = helper.renderPageToPNG(outputFile)
      let hasTopBorder = false
      // a hairline border is <1pt thick, so the y step must be fine enough
      // not to step over it entirely
      for (let y = yTop - 14; y <= yTop - 2 && !hasTopBorder; y += 0.25) {
        for (let x = xFrom; x <= xTo && !hasTopBorder; x += 2) {
          hasTopBorder = helper.hasInkAt(png, 150, x, y)
        }
      }
      assert.ok(
        hasTopBorder,
        'expected a visible top frame border above the table header row',
      )
    })

    // https://github.com/ggrossetie/asciidoctor-web-pdf/issues/84
    it('should render the revision number, date and remark on the title page', async () => {
      const outputFile = outputPath('title-page-metadata.pdf')
      await converter.convert(
        { path: fixturesPath('title-page-metadata.adoc') },
        { to_file: outputFile },
        false,
      )
      const text = helper.extractText(outputFile)
      assert.ok(
        text.includes('2.5'),
        'expected the revision number to be rendered',
      )
      assert.ok(
        text.includes('2026-08-15'),
        'expected the revision date to be rendered',
      )
      assert.ok(
        text.includes('Draft for review'),
        'expected the revision remark to be rendered',
      )
    })
  })

  describe('Backlog triage — already working today', () => {
    // https://github.com/ggrossetie/asciidoctor-web-pdf/issues/605
    // Reported against the Paged.js-specific page-count markup, which no
    // longer exists post-migration (PR #725). Kept as a regression guard.
    it('should not add an extra title page for the book doctype with a private running docinfo file', async () => {
      const withDocinfo = await convert(
        fixturesPath('running-elements-book.adoc'),
        outputPath('running-elements-book.pdf'),
      )
      const withoutDocinfo = await convert(
        fixturesPath('running-elements-book-no-docinfo.adoc'),
        outputPath('running-elements-book-no-docinfo.pdf'),
      )
      assert.strictEqual(
        withDocinfo.getPages().length,
        withoutDocinfo.getPages().length,
        'expected docinfo:private plus a running docinfo file not to add an extra page compared to the same book without it',
      )
    })

    // https://github.com/ggrossetie/asciidoctor-web-pdf/issues/649
    it('should allow a subclass to override a single template method without reimplementing the others', async () => {
      class CustomDocumentPDFConverter extends DocumentPDFConverter {
        titlePage(node) {
          if (!node.getDocumentTitle()) {
            return ''
          }
          return `<div id="cover" class="custom-title-page">CUSTOM-TITLE-PAGE-MARKER ${node.getDocumentTitle()}</div>`
        }
      }
      const instance = new CustomDocumentPDFConverter()
      const customTemplates = {
        document: (node, opts) => instance.convert_document(node, opts),
        convert_outline: (node, opts) => instance.convert_outline(node, opts),
        admonition: (node) => instance.convert_admonition(node),
        inline_callout: (node) => instance.convert_inline_callout(node),
        inline_image: (node) => instance.convert_inline_image(node),
        inline_footnote: (node) => instance.convert_inline_footnote(node),
        colist: (node) => instance.convert_colist(node),
        page_break: (node) => instance.convert_page_break(node),
        preamble: (node) => instance.convert_preamble(node),
      }
      converter.registerTemplateConverter(customTemplates)
      try {
        const outputFile = outputPath('custom-template-override.pdf')
        await converter.convert(
          { path: fixturesPath('custom-template-override.adoc') },
          { to_file: outputFile },
          false,
        )
        const text = helper.extractText(outputFile)
        assert.ok(
          text.includes('CUSTOM-TITLE-PAGE-MARKER'),
          'expected the overridden titlePage() method to be used',
        )
        assert.ok(
          text.includes('This admonition should still render'),
          'expected the default (non-overridden) admonition template to still work',
        )
      } finally {
        converter.registerTemplateConverter(templates)
      }
    })

    // https://github.com/ggrossetie/asciidoctor-web-pdf/issues/684
    it('should apply cols alignment to body cells, not just the header row', async () => {
      const outputFile = outputPath('table-column-alignment.pdf')
      await converter.convert(
        { path: fixturesPath('table-column-alignment.adoc') },
        { to_file: outputFile },
        false,
      )
      const words = helper.extractWordBoxes(outputFile)
      const byText = (text) => words.find((word) => word.text === text)
      const closeTo = (a, b) =>
        Math.abs(a - b) < 0.5 ? true : `${a} is not close to ${b}`
      const rightHeader = byText('Right')
      const rightCell = byText('right-cell-marker')
      assert.strictEqual(
        closeTo(rightCell.xMax, rightHeader.xMax),
        true,
        'expected the right-aligned cell to end at the same x position as its header',
      )
      const centerHeader = byText('Center')
      const centerCell = byText('center-cell-marker')
      const headerMidpoint = (centerHeader.xMin + centerHeader.xMax) / 2
      const cellMidpoint = (centerCell.xMin + centerCell.xMax) / 2
      assert.strictEqual(
        closeTo(cellMidpoint, headerMidpoint),
        true,
        'expected the center-aligned cell to share the same horizontal midpoint as its header',
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
