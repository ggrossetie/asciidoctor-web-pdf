# Asciidoctor.js PDF

[![Build Status](https://travis-ci.org/Mogztter/asciidoctor-pdf.js.svg?branch=master)](https://travis-ci.org/Mogztter/asciidoctor-pdf.js)

Convert AsciiDoc document to PDF using Asciidoctor.js and Puppeteer (Headless Chrome)

## About

Inspired by an awesome project named [ReLaXed](https://github.com/RelaxedJS/ReLaXed).

Asciidoctor.js PDF is using Headless Chrome to generate a beautiful PDF.
It allows complex layouts to be defined with CSS and JavaScript, while writing the content in AsciiDoc.

## Usage

    $ npm i asciidoctor asciidoctor-pdf

    $ asciidoctor-pdf document.adoc --template-require ./template.js

## How

The file `template.js` defines how the AsciiDoc content should be converted to HTML 5.
Puppeteer will then run an headless Chrome to generate a PDF from the HTML 5 page.

## Examples

We provides a few examples in the `examples` directory:

**Letter**

    ./bin/asciidoctorjs-pdf ./examples/letter/letter.adoc --template-require ./examples/letter/template.js

**Book**

    ./bin/asciidoctorjs-pdf ./examples/book/book.adoc --template-require ./examples/book/template.js

**Document**

    ./bin/asciidoctorjs-pdf ./examples/document/document.adoc --template-require ./examples/document/templates/index.js

**Slides**

    ./bin/asciidoctorjs-pdf ./examples/slides/slides.adoc --template-require ./examples/slides/template.js

**Resume**

    ./bin/asciidoctorjs-pdf ./examples/resume/resume.adoc --template-require ./examples/resume/template.js
