/* global it, describe */
const cheerio = require('cheerio')
const chai = require('chai')
const expect = chai.expect
const dirtyChai = require('dirty-chai')
chai.use(dirtyChai)

const asciidoctor = require('@asciidoctor/core')()
const DocumentConverter = require('../lib/document/document-converter')

describe('Document converter', () => {
  it('should override the titlePage function', () => {
    class CustomDocumentConverter extends DocumentConverter {
      titlePage (node) {
        return '<h1>Static title</h1>'
      }
    }

    asciidoctor.ConverterFactory.register(new CustomDocumentConverter(), ['custom-web-pdf'])
    const doc = asciidoctor.load(`= Title
Guillaume Grossetie
:title-page:

== Section`, { backend: 'custom-web-pdf' })
    const $ = cheerio.load(doc.convert({ header_footer: true }))
    expect($('h1').text()).to.equal('Static title')
  })
})
