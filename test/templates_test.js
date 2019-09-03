/* global it, describe */
const cheerio = require('cheerio')
const chai = require('chai')
const expect = chai.expect
const dirtyChai = require('dirty-chai')
chai.use(dirtyChai)

const asciidoctor = require('@asciidoctor/core')()
const templates = require('../lib/document/templates.js')

describe('Default converter', () => {
  it('should include a title page if title-page attribute is defined', () => {
    const doc = asciidoctor.load(`= Title
Guillaume Grossetie
:title-page:

== Section`)
    const $ = cheerio.load(templates.document(doc))
    expect($('.title-page > h1').length).to.equal(1)
  })

  it('should include a title page if doctype is book', () => {
    const doc = asciidoctor.load(`= Title
Guillaume Grossetie

== Section`, { doctype: 'book' })
    const $ = cheerio.load(templates.document(doc))
    expect($('.title-page > h1').length).to.equal(1)
  })

  it('should not include a title page', () => {
    const doc = asciidoctor.load(`= Title
Guillaume Grossetie

== Section`)
    const $ = cheerio.load(templates.document(doc))
    expect($('.title-page > h1').length).to.equal(0)
  })

  it('should not include a title page if the document title is empty', () => {
    const doc = asciidoctor.load('Hello world!', { attributes: { 'title-page': '' } })
    const $ = cheerio.load(templates.document(doc))
    expect($('.title-page > h1').length).to.equal(0)
  })

  it('should not include a document title if the document title is empty', () => {
    const doc = asciidoctor.load('Hello world!')
    const $ = cheerio.load(templates.document(doc))
    expect($('.title-document > h1').length).to.equal(0)
  })
})
