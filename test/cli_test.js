const { describe, it } = require('node:test')
const assert = require('node:assert/strict')

const { convert } = require('@asciidoctor/core')
const { PdfOptions, PdfInvoker } = require('../lib/cli.js')

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
