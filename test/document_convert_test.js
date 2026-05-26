const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { parse } = require('node-html-parser')
const ospath = require('node:path')

const asciidoctor = require('@asciidoctor/core')()
const DocumentConverter = require('../lib/document/document-converter')

const fixturesPath = (...paths) => ospath.join(__dirname, 'fixtures', ...paths)

describe('Document converter', () => {
  it('should override the titlePage function', () => {
    class CustomDocumentConverter extends DocumentConverter {
      titlePage(_node) {
        return '<h1>Static title</h1>'
      }
    }

    asciidoctor.ConverterFactory.register(new CustomDocumentConverter(), [
      'custom-web-pdf',
    ])
    const doc = asciidoctor.load(
      `= Title
Guillaume Grossetie
:title-page:

== Section`,
      { backend: 'custom-web-pdf' },
    )
    const root = parse(doc.convert({ header_footer: true }))
    assert.strictEqual(root.querySelector('h1')?.textContent, 'Static title')
  })

  describe('Docinfo', () => {
    it('should include shared (head) docinfo', () => {
      asciidoctor.ConverterFactory.register(new DocumentConverter(), [
        'web-pdf',
      ])
      const root = parse(
        asciidoctor.convertFile(fixturesPath('simple.adoc'), {
          safe: 'safe',
          backend: 'web-pdf',
          header_footer: true,
          to_file: false,
          attributes: { docinfo: 'shared' },
        }),
      )
      assert.strictEqual(
        root
          .querySelector('head > meta[name="keywords"]')
          .getAttribute('content'),
        'journalism, press',
      )
      assert.strictEqual(
        root.querySelectorAll('head > script[src="debug.js"]').length,
        1,
      )
    })
    it('should include private (footer) docinfo', () => {
      asciidoctor.ConverterFactory.register(new DocumentConverter(), [
        'web-pdf',
      ])
      const root = parse(
        asciidoctor.convertFile(fixturesPath('simple.adoc'), {
          safe: 'safe',
          backend: 'web-pdf',
          header_footer: true,
          to_file: false,
          attributes: { docinfo: 'private-footer' },
        }),
      )
      assert.strictEqual(
        root.querySelector('footer')?.textContent,
        'This is the end.',
      )
    })
    it('should include private (running) docinfo', () => {
      asciidoctor.ConverterFactory.register(new DocumentConverter(), [
        'web-pdf',
      ])
      const root = parse(
        asciidoctor.convertFile(fixturesPath('simple.adoc'), {
          safe: 'safe',
          backend: 'web-pdf',
          header_footer: true,
          to_file: false,
          attributes: { docinfo: 'private-running' },
        }),
      )
      assert.strictEqual(root.querySelectorAll('body > .contact-us').length, 1)
    })
  })
})
