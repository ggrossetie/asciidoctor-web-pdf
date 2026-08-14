import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { convert } from '@asciidoctor/core'
import { PdfInvoker, PdfOptions } from '../lib/cli.js'
import { registerTemplateConverter } from '../lib/converter.js'
import { templates } from '../lib/document/document-converter.js'

registerTemplateConverter(templates)

describe('CLI', () => {
  it('should default the backend to pdf', () => {
    const options = new PdfOptions().parse([
      'node',
      'asciidoctor-pdf',
      'doc.adoc',
    ])
    const pdfInvoker = new PdfInvoker(options)
    assert.strictEqual(pdfInvoker.options.options.backend, 'pdf')
  })
  it('should not override an explicit backend', () => {
    const options = new PdfOptions().parse([
      'node',
      'asciidoctor-pdf',
      'doc.adoc',
      '-b',
      'html5',
    ])
    const pdfInvoker = new PdfInvoker(options)
    assert.strictEqual(pdfInvoker.options.options.backend, 'html5')
  })
  it('should set the converter attributes', async () => {
    const options = new PdfOptions().parse([
      'node',
      'asciidoctor-pdf',
      'doc.adoc',
    ])
    const pdfInvoker = new PdfInvoker(options)
    const attributes = pdfInvoker.options.options.attributes
    assert.ok(attributes.includes('converter=web-pdf'))
    assert.ok(attributes.includes('pdf-generator=browser'))
    const html = await convert(
      '{converter} {pdf-generator}',
      Object.assign({}, pdfInvoker.options.options, { standalone: false }),
    )
    assert.strictEqual(
      html,
      `<div class="paragraph">
<p>web-pdf browser</p>
</div>`,
    )
  })
  it('should override the default converter attributes', async () => {
    const options = new PdfOptions().parse([
      'node',
      'asciidoctor-pdf',
      'doc.adoc',
      '-a',
      'converter=custom-pdf',
    ])
    const pdfInvoker = new PdfInvoker(options)
    const attributes = pdfInvoker.options.options.attributes
    assert.ok(attributes.includes('converter=web-pdf'))
    assert.ok(attributes.includes('converter=custom-pdf'))
    const html = await convert(
      '{converter}',
      Object.assign({}, pdfInvoker.options.options, { standalone: false }),
    )
    assert.strictEqual(
      html,
      `<div class="paragraph">
<p>custom-pdf</p>
</div>`,
    )
  })
})
