/* global it, describe */
const chai = require('chai')
const expect = chai.expect
const dirtyChai = require('dirty-chai')
chai.use(dirtyChai)

const { PdfOptions, PdfInvoker, processor } = require('../lib/cli.js')

describe('CLI', () => {
  it('should set the env attributes', () => {
    const options = new PdfOptions().parse(['node', 'asciidoctor-pdf', 'doc.adoc'])
    const pdfInvoker = new PdfInvoker(options)
    const attributes = pdfInvoker.options.options.attributes
    expect(attributes).to.include('env-web-pdf')
    expect(attributes).to.include('env=web-pdf')
    const html = processor.convert('{env}', Object.assign({}, pdfInvoker.options.options, { standalone: false }))
    expect(html).to.equal(`<div class="paragraph">
<p>web-pdf</p>
</div>`)
  })
  it('should override the default env attributes', () => {
    const options = new PdfOptions().parse(['node', 'asciidoctor-pdf', 'doc.adoc', '-a', 'env=pdf'])
    const pdfInvoker = new PdfInvoker(options)
    const attributes = pdfInvoker.options.options.attributes
    expect(attributes).to.include('env-web-pdf')
    expect(attributes).to.include('env=web-pdf')
    expect(attributes).to.include('env=pdf')
    const html = processor.convert('{env}', Object.assign({}, pdfInvoker.options.options, { standalone: false }))
    expect(html).to.equal(`<div class="paragraph">
<p>pdf</p>
</div>`)
  })
})
