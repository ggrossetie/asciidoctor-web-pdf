/* global it, describe */
const cheerio = require('cheerio')
const chai = require('chai')
const expect = chai.expect
const dirtyChai = require('dirty-chai')
chai.use(dirtyChai)

const asciidoctor = require('@asciidoctor/core')()
const templates = require('../lib/document/templates.js')

describe('Default converter', function () {
  it('should include a title page if title-page attribute is defined', function () {
    const doc = asciidoctor.load(`= Title
Guillaume Grossetie
:title-page:

== Section`)
    const $ = cheerio.load(templates.document(doc))
    expect($('#cover').length).to.equal(1)
  })

  it('should include a title page if doctype is book', function () {
    const doc = asciidoctor.load(`= Title
Guillaume Grossetie

== Section`, { doctype: 'book' })
    const $ = cheerio.load(templates.document(doc))
    expect($('#cover').length).to.equal(1)
  })

  it('should not include a title page', function () {
    const doc = asciidoctor.load(`= Title
Guillaume Grossetie

== Section`)
    const $ = cheerio.load(templates.document(doc))
    expect($('#cover').length).to.equal(0)
  })
})
