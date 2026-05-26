import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import ospath from 'node:path'
import { describe, it } from 'node:test'
import { convert, load } from '@asciidoctor/core'
import fileUrl from 'file-url'
import { parse } from 'node-html-parser'
import * as converter from '../lib/converter.js'
import { templates } from '../lib/document/document-converter.js'

converter.registerTemplateConverter(templates)

const require = createRequire(import.meta.url)
const __dirname = import.meta.dirname
const fixturesPath = (...paths) => ospath.join(__dirname, 'fixtures', ...paths)

const mathjaxFileUrl = fileUrl(require.resolve('mathjax/es5/tex-chtml-full.js'))

describe('Default converter', () => {
  describe('Language', () => {
    it('should have a default language', async () => {
      const doc = await load(`= Title

== Section`)
      const root = parse(await templates.document(doc))
      assert.strictEqual(root.querySelector('html').getAttribute('lang'), 'en')
    })

    it('respect the document lang attribute', async () => {
      const doc = await load(`= Title
:lang: de

== Section`)
      const root = parse(await templates.document(doc))
      assert.strictEqual(root.querySelector('html').getAttribute('lang'), 'de')
    })

    it('respect the document nolang attribute', async () => {
      const doc = await load(`= Title
:nolang:

== Section`)
      const root = parse(await templates.document(doc))
      assert.strictEqual(
        root.querySelector('html').getAttribute('lang') ?? undefined,
        undefined,
      )
    })
  })

  describe('Page title', () => {
    it('should include a title page if title-page attribute is defined', async () => {
      const doc = await load(`= Title
Guillaume Grossetie
:title-page:

== Section`)
      const root = parse(await doc.convert({ standalone: true }))
      assert.strictEqual(
        root.querySelector('.title-page > h1')?.textContent,
        'Title',
      )
    })

    it('should include a title page if doctype is book', async () => {
      const doc = await load(
        `= Title
Guillaume Grossetie

== Section`,
        { doctype: 'book' },
      )
      const root = parse(await doc.convert({ standalone: true }))
      assert.strictEqual(
        root.querySelector('.title-page > h1')?.textContent,
        'Title',
      )
    })

    it('should not include a title page', async () => {
      const doc = await load(`= Title
Guillaume Grossetie

== Section`)
      const root = parse(await doc.convert({ standalone: true }))
      assert.strictEqual(root.querySelectorAll('.title-page > h1').length, 0)
    })

    it('should not include a title page if the document title is empty', async () => {
      const doc = await load('Hello world!', {
        attributes: { 'title-page': '' },
      })
      const root = parse(await doc.convert({ standalone: true }))
      assert.strictEqual(root.querySelectorAll('.title-page > h1').length, 0)
    })

    it('should not include a document title if the document title is empty', async () => {
      const doc = await load('Hello world!')
      const root = parse(await doc.convert({ standalone: true }))
      assert.strictEqual(
        root.querySelectorAll('.title-document > h1').length,
        0,
      )
    })
  })

  it('should replace the default stylesheet with a custom stylesheet', async () => {
    const doc = await load('[.greetings]#Hello world#', {
      attributes: { stylesheet: fixturesPath('custom.css') },
    })
    const root = parse(await doc.convert({ standalone: true }))
    assert.ok(
      !root
        .querySelector('head')
        .innerHTML.includes('Asciidoctor default stylesheet'),
    )
    assert.strictEqual(
      root.querySelectorAll(`head > link[href="${fixturesPath('custom.css')}"]`)
        .length,
      1,
    )
  })

  it('should load multiple stylesheets', async () => {
    const doc = await load('Hello world', {
      attributes: {
        stylesheet: `${fixturesPath('variable.css')}, ,${fixturesPath('theme.css')},`,
      },
    })
    const root = parse(await doc.convert({ standalone: true }))
    assert.ok(
      !root
        .querySelector('head')
        .innerHTML.includes('Asciidoctor default stylesheet'),
    )
    assert.strictEqual(
      root.querySelectorAll(
        `head > link[href="${fixturesPath('variable.css')}"]`,
      ).length,
      1,
    )
    assert.strictEqual(
      root.querySelectorAll(`head > link[href="${fixturesPath('theme.css')}"]`)
        .length,
      1,
    )
  })

  it('should resolve the stylesheet when using a relative path', async () => {
    const doc = await load('[.greetings]#Hello world#', {
      attributes: {
        stylesheet: ospath.join(
          '@asciidoctor',
          'core',
          'data',
          'asciidoctor-default.css',
        ),
      },
    })
    const root = parse(await doc.convert({ standalone: true }))
    assert.ok(
      !root
        .querySelector('head')
        .innerHTML.includes('Asciidoctor default stylesheet'),
    )
    const href = ospath.resolve(
      ospath.join(
        __dirname,
        '..',
        'node_modules',
        '@asciidoctor',
        'core',
        'data',
        'asciidoctor-default.css',
      ),
    )
    assert.strictEqual(
      root.querySelectorAll(`head > link[href="${href}"]`).length,
      1,
    )
  })

  describe('Stem', () => {
    it('should include MathML when stem is set', async () => {
      const doc = await load(`= Title
:stem:

== Section`)
      const root = parse(await templates.document(doc))
      assert.strictEqual(
        root.querySelectorAll(`script[src="${mathjaxFileUrl}"]`).length,
        1,
      )
      assert.ok(
        root
          .querySelector('script[data-type="mathjax-config"]')
          .innerHTML.includes('tags: "none"'),
      )
    })

    it('should not include MathML when stem is not set', async () => {
      const doc = await load(`= Title
:stem!:

== Section`)
      const root = parse(await templates.document(doc))
      assert.strictEqual(
        root.querySelectorAll(`script[src="${mathjaxFileUrl}"]`).length,
        0,
      )
    })

    it('should not include MathML when stem is not present', async () => {
      const doc = await load(`= Title

== Section`)
      const root = parse(await templates.document(doc))
      assert.strictEqual(
        root.querySelectorAll(`script[src="${mathjaxFileUrl}"]`).length,
        0,
      )
    })

    it('should add equation numbers when eqnums equals AMS', async () => {
      const doc = await load(`= Title
:stem:
:eqnums: AMS

== Section`)
      const root = parse(await templates.document(doc))
      assert.strictEqual(
        root.querySelectorAll(`script[src="${mathjaxFileUrl}"]`).length,
        1,
      )
      assert.ok(
        root
          .querySelector('script[data-type="mathjax-config"]')
          .innerHTML.includes('tags: "ams"'),
      )
    })

    it('should add equation numbers when eqnums is present', async () => {
      const doc = await load(`= Title
:stem:
:eqnums:

== Section`)
      const root = parse(await templates.document(doc))
      assert.strictEqual(
        root.querySelectorAll(`script[src="${mathjaxFileUrl}"]`).length,
        1,
      )
      assert.ok(
        root
          .querySelector('script[data-type="mathjax-config"]')
          .innerHTML.includes('tags: "ams"'),
      )
    })

    it('should add equation numbers when eqnums equals all', async () => {
      const doc = await load(`= Title
:stem:
:eqnums: all

== Section`)
      const root = parse(await templates.document(doc))
      assert.strictEqual(
        root.querySelectorAll(`script[src="${mathjaxFileUrl}"]`).length,
        1,
      )
      assert.ok(
        root
          .querySelector('script[data-type="mathjax-config"]')
          .innerHTML.includes('tags: "all"'),
      )
    })
  })

  describe('Admonition', () => {
    it('should use an emoji shortcode as admonition icon', async () => {
      const doc = await load(`= Title
:tip-caption: :bulb:

[TIP]
It's possible to use emojis as admonition.`)
      const root = parse(await doc.convert())
      assert.strictEqual(
        root.querySelector('td.icon > .title').innerHTML,
        ':bulb:',
      )
    })
  })

  describe('Inline icon', () => {
    describe('FontAwesome SVG icons set', () => {
      it('should enable SVG icon when icons attribute is equals to font (user experience)', async () => {
        const doc = await load(
          `= Title
:icons: font

icon:address-book[]`,
          { safe: 'safe' },
        )
        const root = parse(await doc.convert())
        assert.strictEqual(
          root.querySelector('svg[data-prefix="fas"][data-icon="address-book"]')
            .innerHTML,
          '<path fill="currentColor" d="M96 0C60.7 0 32 28.7 32 64V448c0 35.3 28.7 64 64 64H384c35.3 0 64-28.7 64-64V64c0-35.3-28.7-64-64-64H96zM208 288h64c44.2 0 80 35.8 80 80c0 8.8-7.2 16-16 16H144c-8.8 0-16-7.2-16-16c0-44.2 35.8-80 80-80zm96-96c0 35.3-28.7 64-64 64s-64-28.7-64-64s28.7-64 64-64s64 28.7 64 64zM512 80c0-8.8-7.2-16-16-16s-16 7.2-16 16v64c0 8.8 7.2 16 16 16s16-7.2 16-16V80zM496 192c-8.8 0-16 7.2-16 16v64c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16zm16 144c0-8.8-7.2-16-16-16s-16 7.2-16 16v64c0 8.8 7.2 16 16 16s16-7.2 16-16V336z"></path>',
        )
      })
      it('should render a solid FontAwesome SVG icon (default)', async () => {
        const doc = await load(`:icontype: svg

icon:address-book[]`)
        const root = parse(await doc.convert())
        assert.strictEqual(
          root.querySelector('svg[data-prefix="fas"][data-icon="address-book"]')
            .innerHTML,
          '<path fill="currentColor" d="M96 0C60.7 0 32 28.7 32 64V448c0 35.3 28.7 64 64 64H384c35.3 0 64-28.7 64-64V64c0-35.3-28.7-64-64-64H96zM208 288h64c44.2 0 80 35.8 80 80c0 8.8-7.2 16-16 16H144c-8.8 0-16-7.2-16-16c0-44.2 35.8-80 80-80zm96-96c0 35.3-28.7 64-64 64s-64-28.7-64-64s28.7-64 64-64s64 28.7 64 64zM512 80c0-8.8-7.2-16-16-16s-16 7.2-16 16v64c0 8.8 7.2 16 16 16s16-7.2 16-16V80zM496 192c-8.8 0-16 7.2-16 16v64c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16zm16 144c0-8.8-7.2-16-16-16s-16 7.2-16 16v64c0 8.8 7.2 16 16 16s16-7.2 16-16V336z"></path>',
        )
      })
      it('should render a regular FontAwesome SVG icon (default)', async () => {
        const doc = await load(`:icontype: svg

icon:address-book[set=far]`)
        const root = parse(await doc.convert())
        assert.strictEqual(
          root.querySelector('svg[data-prefix="far"][data-icon="address-book"]')
            .innerHTML,
          '<path fill="currentColor" d="M272 288h-64C163.8 288 128 323.8 128 368C128 376.8 135.2 384 144 384h192c8.836 0 16-7.164 16-16C352 323.8 316.2 288 272 288zM240 256c35.35 0 64-28.65 64-64s-28.65-64-64-64c-35.34 0-64 28.65-64 64S204.7 256 240 256zM496 320H480v96h16c8.836 0 16-7.164 16-16v-64C512 327.2 504.8 320 496 320zM496 64H480v96h16C504.8 160 512 152.8 512 144v-64C512 71.16 504.8 64 496 64zM496 192H480v96h16C504.8 288 512 280.8 512 272v-64C512 199.2 504.8 192 496 192zM384 0H96C60.65 0 32 28.65 32 64v384c0 35.35 28.65 64 64 64h288c35.35 0 64-28.65 64-64V64C448 28.65 419.3 0 384 0zM400 448c0 8.836-7.164 16-16 16H96c-8.836 0-16-7.164-16-16V64c0-8.838 7.164-16 16-16h288c8.836 0 16 7.162 16 16V448z"></path>',
        )
      })
      it('should render a brand FontAwesome SVG icon (default)', async () => {
        const doc = await load(`:icontype: svg

icon:chrome@fab[]`)
        const root = parse(await doc.convert())
        assert.strictEqual(
          root.querySelector('svg[data-prefix="fab"][data-icon="chrome"]')
            .innerHTML,
          '<path fill="currentColor" d="M0 256C0 209.4 12.47 165.6 34.27 127.1L144.1 318.3C166 357.5 207.9 384 256 384C270.3 384 283.1 381.7 296.8 377.4L220.5 509.6C95.9 492.3 0 385.3 0 256zM365.1 321.6C377.4 302.4 384 279.1 384 256C384 217.8 367.2 183.5 340.7 160H493.4C505.4 189.6 512 222.1 512 256C512 397.4 397.4 511.1 256 512L365.1 321.6zM477.8 128H256C193.1 128 142.3 172.1 130.5 230.7L54.19 98.47C101 38.53 174 0 256 0C350.8 0 433.5 51.48 477.8 128V128zM168 256C168 207.4 207.4 168 256 168C304.6 168 344 207.4 344 256C344 304.6 304.6 344 256 344C207.4 344 168 304.6 168 256z"></path>',
        )
      })
    })
  })

  describe('Table Of Contents', () => {
    it('should add a toc when toc is set', async () => {
      const doc = await load(
        `= Title
:toc:

== Section 1

== Section 2

== Section 3`,
        { safe: 'safe' },
      )
      const root = parse(await doc.convert())
      assert.strictEqual(
        root.querySelectorAll('#toc > ul.sectlevel1 > li').length,
        3,
      )
    })

    it("should not add a toc when there's no section", async () => {
      const doc = await load(
        `= Title
:toc:

Just a preamble.`,
        { safe: 'safe' },
      )
      const root = parse(await doc.convert())
      assert.strictEqual(
        root.querySelectorAll('#toc > ul.sectlevel1 > li').length,
        0,
      )
    })

    it('should not add a toc in the header when toc placement is macro', async () => {
      const doc = await load(
        `= Title
:toc: macro

== Section 1

== Section 2

== Section 3`,
        { safe: 'safe' },
      )
      const root = parse(await doc.convert())
      assert.strictEqual(
        root.querySelectorAll('#toc > ul.sectlevel1 > li').length,
        0,
      )
    })

    it('should use a template directory (Nunjucks)', async () => {
      const html = await convert('Hello *world*', {
        template_dirs: [fixturesPath('templates', 'nunjucks')],
      })
      assert.strictEqual(
        html,
        '<p class="nunjucks">Hello <strong>world</strong></p>',
      )
    })
  })
})
