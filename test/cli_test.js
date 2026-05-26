import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { convert } from '@asciidoctor/core'
import { PdfInvoker, PdfOptions } from '../lib/cli.js'

describe('CLI', () => {
  it('should set the env attributes', async () => {
    const options = new PdfOptions().parse([
      'node',
      'asciidoctor-pdf',
      'doc.adoc',
    ])
    const pdfInvoker = new PdfInvoker(options)
    const attributes = pdfInvoker.options.options.attributes
    assert.ok(attributes.includes('env-web-pdf'))
    assert.ok(attributes.includes('env=web-pdf'))
    const html = await convert(
      '{env}',
      Object.assign({}, pdfInvoker.options.options, { standalone: false }),
    )
    assert.strictEqual(
      html,
      `<div class="paragraph">
<p>web-pdf</p>
</div>`,
    )
  })
  it('should override the default env attributes', async () => {
    const options = new PdfOptions().parse([
      'node',
      'asciidoctor-pdf',
      'doc.adoc',
      '-a',
      'env=pdf',
    ])
    const pdfInvoker = new PdfInvoker(options)
    const attributes = pdfInvoker.options.options.attributes
    assert.ok(attributes.includes('env-web-pdf'))
    assert.ok(attributes.includes('env=web-pdf'))
    assert.ok(attributes.includes('env=pdf'))
    const html = await convert(
      '{env}',
      Object.assign({}, pdfInvoker.options.options, { standalone: false }),
    )
    assert.strictEqual(
      html,
      `<div class="paragraph">
<p>pdf</p>
</div>`,
    )
  })
})
