const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const cheerio = require('cheerio')
const ospath = require('path')

const asciidoctor = require('@asciidoctor/core')()
const DocumentConverter = require('../lib/document/document-converter')

const fixturesPath = (...paths) => ospath.join(__dirname, 'fixtures', ...paths)

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
    assert.strictEqual($('h1').text(), 'Static title')
  })

  describe('Docinfo', () => {
    it('should include shared (head) docinfo', () => {
      asciidoctor.ConverterFactory.register(new DocumentConverter(), ['web-pdf'])
      const $ = cheerio.load(asciidoctor.convertFile(fixturesPath('simple.adoc'), {
        safe: 'safe',
        backend: 'web-pdf',
        header_footer: true,
        to_file: false,
        attributes: { docinfo: 'shared' }
      }))
      assert.strictEqual($('head > meta[name="keywords"]').attr('content'), 'journalism, press')
      assert.strictEqual($('head > script[src="debug.js"]').length, 1)
    })
    it('should include private (footer) docinfo', () => {
      asciidoctor.ConverterFactory.register(new DocumentConverter(), ['web-pdf'])
      const $ = cheerio.load(asciidoctor.convertFile(fixturesPath('simple.adoc'), {
        safe: 'safe',
        backend: 'web-pdf',
        header_footer: true,
        to_file: false,
        attributes: { docinfo: 'private-footer' }
      }))
      assert.strictEqual($('footer').text(), 'This is the end.')
    })
    it('should include private (running) docinfo', () => {
      asciidoctor.ConverterFactory.register(new DocumentConverter(), ['web-pdf'])
      const $ = cheerio.load(asciidoctor.convertFile(fixturesPath('simple.adoc'), {
        safe: 'safe',
        backend: 'web-pdf',
        header_footer: true,
        to_file: false,
        attributes: { docinfo: 'private-running' }
      }))
      assert.strictEqual($('body > .contact-us').length, 1)
    })
  })
})
