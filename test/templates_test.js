/* global it, describe */
const cheerio = require('cheerio')
const chai = require('chai')
const expect = chai.expect
const dirtyChai = require('dirty-chai')
chai.use(dirtyChai)

const asciidoctor = require('@asciidoctor/core')()
const converter = require('../lib/converter.js')
const templates = require('../lib/document/templates.js')
converter.registerTemplateConverter(asciidoctor, templates)

describe('Default converter', () => {
  it('should include a title page if title-page attribute is defined', () => {
    const doc = asciidoctor.load(`= Title
Guillaume Grossetie
:title-page:

== Section`)
    const $ = cheerio.load(doc.convert({ header_footer: true }))
    expect($('.title-page > h1').text()).to.equal('Title')
  })

  it('should include a title page if doctype is book', () => {
    const doc = asciidoctor.load(`= Title
Guillaume Grossetie

== Section`, { doctype: 'book' })
    const $ = cheerio.load(doc.convert({ header_footer: true }))
    expect($('.title-page > h1').text()).to.equal('Title')
  })

  it('should not include a title page', () => {
    const doc = asciidoctor.load(`= Title
Guillaume Grossetie

== Section`)
    const $ = cheerio.load(doc.convert({ header_footer: true }))
    expect($('.title-page > h1').length).to.equal(0)
  })

  it('should not include a title page if the document title is empty', () => {
    const doc = asciidoctor.load('Hello world!', { attributes: { 'title-page': '' } })
    const $ = cheerio.load(doc.convert({ header_footer: true }))
    expect($('.title-page > h1').length).to.equal(0)
  })

  it('should not include a document title if the document title is empty', () => {
    const doc = asciidoctor.load('Hello world!')
    const $ = cheerio.load(doc.convert({ header_footer: true }))
    expect($('.title-document > h1').length).to.equal(0)
  })

  it('should include a custom stylesheet', () => {
    const doc = asciidoctor.load('[.greetings]#Hello world#', { attributes: { stylesheet: `${__dirname}/fixtures/custom.css` } })
    const $ = cheerio.load(templates.document(doc))
    expect($('head > style').html()).to.have.string('.greetings{color: #fecbcb;}')
  })
})
