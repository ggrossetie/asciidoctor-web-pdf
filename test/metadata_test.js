const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { PDFDocument, PDFName, PDFHexString } = require('pdf-lib')

const asciidoctor = require('@asciidoctor/core')()
const { addMetadata } = require('../lib/metadata.js')
const { version: pkgVersion } = require('../package.json')

const decodePDFHexValue = (value) => {
  const buffer = Buffer.from(value, 'hex')
  let str = ''
  new Uint16Array(buffer).forEach((v, index) => {
    if (index === 0 || index === 1) {
      // ignore byteOrderMark
    } else {
      if (index % 2 !== 0) {
        str += String.fromCharCode(v)
      }
    }
  })
  return str
}

const assertMetadataEqual = (pdf, metadataKey, expectedValue) => {
  const metadata = pdf.context.lookup(pdf.context.trailerInfo.Info)
  const pdfValue = metadata.get(PDFName.of(metadataKey))
  if (pdfValue instanceof PDFHexString) {
    assert.strictEqual(
      decodePDFHexValue(pdfValue.value),
      expectedValue,
      metadataKey,
    )
  } else {
    assert.strictEqual(pdfValue.value, expectedValue, metadataKey)
  }
}

const toPdfWithMetadata = async (content, options) => {
  const doc = asciidoctor.load(content, options)
  const pdfDoc = await PDFDocument.create()
  return addMetadata(pdfDoc, doc)
}

describe('PDF metadata', () => {
  it('should add metadata from attributes', async () => {
    const pdfWithMetadata =
      await toPdfWithMetadata(`= The Dangerous and Thrilling Documentation Chronicles
Guillaume Grossetie <ggrossetie@asciidoctor.org>
v1.0, 2019-11-05
:keywords: pdf,asciidoctor,doc

content`)

    assertMetadataEqual(
      pdfWithMetadata,
      'Title',
      'The Dangerous and Thrilling Documentation Chronicles',
    )
    assertMetadataEqual(pdfWithMetadata, 'Author', 'Guillaume Grossetie')
    assertMetadataEqual(pdfWithMetadata, 'Subject', '')
    assertMetadataEqual(pdfWithMetadata, 'Keywords', 'pdf asciidoctor doc')
    assertMetadataEqual(pdfWithMetadata, 'Producer', 'Guillaume Grossetie')
    assertMetadataEqual(
      pdfWithMetadata,
      'Creator',
      `Asciidoctor Web PDF ${pkgVersion}`,
    )
  })

  it('should add epoch unix at start date if reproducible attribute is set', async () => {
    const pdfWithMetadata = await toPdfWithMetadata('', {
      attributes: { reproducible: true },
    })

    assertMetadataEqual(pdfWithMetadata, 'CreationDate', 'D:19700101000000Z')
    assertMetadataEqual(pdfWithMetadata, 'ModDate', 'D:19700101000000Z')
  })

  it('should set Producer field to value of publisher attribute if set', async () => {
    const pdfWithMetadata = await toPdfWithMetadata(`= Document Title
Author Name
:publisher: Big Cheese

content`)

    assertMetadataEqual(pdfWithMetadata, 'Author', 'Author Name')
    assertMetadataEqual(pdfWithMetadata, 'Producer', 'Big Cheese')
  })

  it('should set Author and Producer field to value of author attribute if set', async () => {
    const pdfWithMetadata = await toPdfWithMetadata(`= Document Title
:author: Author Name

content`)

    assertMetadataEqual(pdfWithMetadata, 'Producer', 'Author Name')
    assertMetadataEqual(pdfWithMetadata, 'Author', 'Author Name')
  })

  it('should set Producer field to value of Creator field by default', async () => {
    const pdfWithMetadata = await toPdfWithMetadata('hello')

    const creator = `Asciidoctor Web PDF ${pkgVersion}`
    assertMetadataEqual(pdfWithMetadata, 'Creator', creator)
    assertMetadataEqual(pdfWithMetadata, 'Producer', creator)
  })

  it('should set Subject field to value of subject attribute if set', async () => {
    const pdfWithMetadata = await toPdfWithMetadata(`= Document Title
:subject: Cooking

content`)

    assertMetadataEqual(pdfWithMetadata, 'Subject', 'Cooking')
  })

  it('should set Lang field with the default language (en)', async () => {
    const pdfWithMetadata = await toPdfWithMetadata(`= Document Title

content`)

    assert.strictEqual(
      pdfWithMetadata.catalog.get(PDFName.of('Lang')).value,
      'en',
    )
  })

  it('should set Lang field to value of lang attribute', async () => {
    const pdfWithMetadata = await toPdfWithMetadata(`= Document Title
:lang: de

content`)

    assert.strictEqual(
      pdfWithMetadata.catalog.get(PDFName.of('Lang')).value,
      'de',
    )
  })

  it('should not set Lang field when nolang attribute is set', async () => {
    const pdfWithMetadata = await toPdfWithMetadata(`= Document Title
:nolang:

content`)

    assert.strictEqual(
      pdfWithMetadata.catalog.get(PDFName.of('Lang')),
      undefined,
    )
  })
})
