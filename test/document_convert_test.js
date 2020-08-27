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

  describe('Docinfo', () => {
    it('should include shared (head) docinfo', () => {
      asciidoctor.ConverterFactory.register(new DocumentConverter(), ['web-pdf'])
      const $ = cheerio.load(asciidoctor.convertFile(`${__dirname}/fixtures/simple.adoc`, {
        safe: 'safe',
        backend: 'web-pdf',
        header_footer: true,
        to_file: false,
        attributes: { docinfo: 'shared' }
      }))
      expect($('head > meta[name="keywords"]').attr('content')).to.equal('journalism, press')
      expect($('head > script[src="debug.js"]').length).to.equal(1)
    })
    it('should include private (footer) docinfo', () => {
      asciidoctor.ConverterFactory.register(new DocumentConverter(), ['web-pdf'])
      const $ = cheerio.load(asciidoctor.convertFile(`${__dirname}/fixtures/simple.adoc`, {
        safe: 'safe',
        backend: 'web-pdf',
        header_footer: true,
        to_file: false,
        attributes: { docinfo: 'private-footer' }
      }))
      expect($('footer').text()).to.equal('This is the end.')
    })
  })
})
