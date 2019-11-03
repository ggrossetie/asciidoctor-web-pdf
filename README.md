# Asciidoctor PDF

[![Build Status](https://travis-ci.org/Mogztter/asciidoctor-pdf.js.svg?branch=master)](https://travis-ci.org/Mogztter/asciidoctor-pdf.js)
[![npm version](https://img.shields.io/npm/v/asciidoctor-pdf.svg)](https://www.npmjs.org/package/asciidoctor-pdf)

A PDF converter for AsciiDoc based on web technologies.
It allows complex layouts to be defined with CSS and JavaScript, while writing the content in AsciiDoc.

<table>
  <tr align="center">
    <td width="25%">
      <a href="https://github.com/Mogztter/asciidoctor-pdf.js/blob/master/examples/document/document.pdf">
        <img src="https://github.com/Mogztter/asciidoctor-pdf.js/raw/master/examples/document/document_screenshot.png" />
      </a>
      Document -
      <a href="https://github.com/Mogztter/asciidoctor-pdf.js/tree/master/examples/document/"> source </a> /
      <a href="https://github.com/Mogztter/asciidoctor-pdf.js/blob/master/examples/document/document.pdf"> PDF </a>
    </td>
    <td width="25%">
      <a href="https://github.com/Mogztter/asciidoctor-pdf.js/blob/master/examples/letter/letter.pdf">
        <img src="https://github.com/Mogztter/asciidoctor-pdf.js/raw/master/examples/letter/letter_screenshot.png" />
      </a>
      Letter -
      <a href="https://github.com/Mogztter/asciidoctor-pdf.js/tree/master/examples/letter/"> Source </a> /
      <a href="https://github.com/Mogztter/asciidoctor-pdf.js/blob/master/examples/letter/letter.pdf"> PDF </a>
    </td>
    <td width="25%">
      <a href="https://github.com/Mogztter/asciidoctor-pdf.js/blob/master/examples/book/book.pdf">
        <img src="https://github.com/Mogztter/asciidoctor-pdf.js/raw/master/examples/book/book_screenshot.png" />
      </a>
      Book -
      <a href="https://github.com/Mogztter/asciidoctor-pdf.js/tree/master/examples/book/"> source </a> /
      <a href="https://github.com/Mogztter/asciidoctor-pdf.js/blob/master/examples/book/book.pdf"> PDF </a>
    </td>
    <td width="25%">
      <a href="https://github.com/Mogztter/asciidoctor-pdf.js/blob/master/examples/cheat-sheet/maven-security-cheat-sheet.pdf">
      <img src="https://github.com/Mogztter/asciidoctor-pdf.js/raw/master/examples/cheat-sheet/maven-security-cheat-sheet_screenshot.png" /></a>
      Cheat sheet -
      <a href="https://github.com/Mogztter/asciidoctor-pdf.js/tree/master/examples/cheat-sheet/"> Source </a> /
      <a href="https://github.com/Mogztter/asciidoctor-pdf.js/blob/master/examples/cheat-sheet/maven-security-cheat-sheet.pdf"> PDF </a>
    </td>
  </tr>
</table>
<table>
  <tr align="center">
    <td width="25%">
      <a href="https://github.com/Mogztter/asciidoctor-pdf.js/blob/master/examples/resume/resume.pdf">
        <img src="https://github.com/Mogztter/asciidoctor-pdf.js/raw/master/examples/resume/resume_screenshot.png" />
      </a>
      Resume -
      <a href="https://github.com/Mogztter/asciidoctor-pdf.js/tree/master/examples/resume/"> Source </a> /
      <a href="https://github.com/Mogztter/asciidoctor-pdf.js/blob/master/examples/resume/resume.pdf"> PDF </a>
    </td>
    <td width="25%">
      <a href="https://github.com/Mogztter/asciidoctor-pdf.js/blob/master/examples/slides/ioslides/presentation.pdf">
        <img src="https://github.com/Mogztter/asciidoctor-pdf.js/raw/master/examples/slides/ioslides/presentation_screenshot.png" />
      </a>
      Slides -
      <a href="https://github.com/Mogztter/asciidoctor-pdf.js/tree/master/examples/slides/ioslides/"> Source </a> /
      <a href="https://github.com/Mogztter/asciidoctor-pdf.js/blob/master/examples/slides/ioslides/presentation.pdf"> PDF </a>
    </td>
    <td width="25%"></td>
    <td width="25%"></td>
  </tr>
</table>

Asciidoctor PDF has support for LaTeX-style mathematical equations (via [MathJax](https://www.mathjax.org/)) and syntax highlighting (via [highlight.js](https://highlightjs.org/)).
Many more features can be added by importing an existing JavaScript or CSS framework.

## Install globally via npm

You need [Node.js](https://nodejs.org) installed on your machine to install and run Asciidoctor PDF.
To install Asciidoctor PDF, open a terminal and type:

    $ npm i -g asciidoctor asciidoctor-pdf

**NOTE:** We recommend installing Asciidoctor PDF globally to make the `asciidoctor-pdf` command available on your `PATH`.
However, you can also install Asciidoctor PDF in a project directory if you prefer.

Verify that the `asciidoctor-pdf` command is available on your `PATH` by running:

    $ asciidoctor-pdf --version

If installation was successful, the command should report the version of Asciidoctor PDF.

```console
$ asciidoctor-pdf --version
Asciidoctor PDF 1.0.0-alpha.3 using Asciidoctor.js 2.0.0 (Asciidoctor 2.0.6) [https://asciidoctor.org]
Runtime Environment (node v10.15.1 on linux)
CLI version 3.0.1
```

## Install locally via yarn (alternative install)

required: current version of yarn installed (should also work with npm)

Create a file `package.json` within your project with the following content:

```javascript
{
  "name": "example",
  "version": "1.0.0",
  "dependencies": {
    "asciidoctor": "^2.0.3",
    "asciidoctor-pdf": "^1.0.0-alpha.3"
  },
  "scripts": {
    "render-pdf": "asciidoctor-pdf <path to your adoc-file>"
  }
}
```

the commands

```javascript
yarn install
yarn render-pdf
```

will then install `asciidoctor` and `asciidoctor-pdf` as local module and render your AsciiDoc file as PDF to the same folder as your soruce file is located.

To use npm instead of yarn, use `npm install` and `npm run render-pdf` instead.

Note: this is verified to work on Windows in WSL.

## Getting started

Asciidoctor PDF provides a standard document layout.
To convert an AsciiDoc document using this layout, open a terminal and type:  

    $ asciidoctor-pdf document.adoc

## Configuration

The standard document layout can be configured depending on your needs.

**STEM support**

To activate equation and formula support, set the `stem` attribute in the document's header (or by passing the attribute to the command line):

    $ asciidoctor-pdf document.adoc -a stem

**Title page**

The title page is enabled if either of these conditions are met:

- The document has the `book` doctype.
- The `title-page` attribute is set (with an empty value) in the document header.

```
$ asciidoctor-pdf document.adoc -a title-page
```

**Additional styles**

You can provide a custom stylesheet using the `stylesheet` attribute. 
You can also specify where the stylesheet is located with the `stylesdir` attribute.

    $ asciidoctor-pdf document.adoc -a stylesheet=custom.css

**NOTE:** The default stylesheet will still be applied.
While it's possible to override existing rules, the goal is to provide additional styles for custom roles, for instance:

```adoc
Please edit the [.path]_package.json_ file.
```

```css
.path {
  color: #fecbcb;
}
```

## Custom layout

It's also possible to create your own layout by extending the default HTML 5 converter.
To create a new layout you will need some JavaScript knowledge.

Let's say that we want to override how the `document` node is converted.

```js
module.exports = {
  document: (node) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link href="./layout.css" rel="stylesheet">
</head>
<body>
${node.getContent()}
</body>`,
}
```

In the above example, we are using [Template Literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals) but you can use your favorite template engine.
You can also override other elements.

<details>
  <summary>Complete list of elements</summary>
  <ul>
    <li><code>document</code></li>
    <li><code>embedded</code></li>
    <li><code>outline</code></li>
    <li><code>section</code></li>
    <li><code>admonition</code></li>
    <li><code>audio</code></li>
    <li><code>colist</code></li>
    <li><code>dlist</code></li>
    <li><code>example</code></li>
    <li><code>floating-title</code></li>
    <li><code>image</code></li>
    <li><code>listing</code></li>
    <li><code>literal</code></li>
    <li><code>stem</code></li>
    <li><code>olist</code></li>
    <li><code>open</code></li>
    <li><code>page_break</code></li>
    <li><code>paragraph</code></li>
    <li><code>preamble</code></li>
    <li><code>quote</code></li>
    <li><code>thematic_break</code></li>
    <li><code>sidebar</code></li>
    <li><code>table</code></li>
    <li><code>toc</code></li>
    <li><code>ulist</code></li>
    <li><code>verse</code></li>
    <li><code>video</code></li>
    <li><code>inline_anchor</code></li>
    <li><code>inline_break</code></li>
    <li><code>inline_button</code></li>
    <li><code>inline_callout</code></li>
    <li><code>inline_footnote</code></li>
    <li><code>inline_image</code></li>
    <li><code>inline_indexterm</code></li>
    <li><code>inline_kbd</code></li>
    <li><code>inline_menu</code></li>
    <li><code>inline_quoted</code></li>
</ul>
</details>

The function takes one parameter, called `node`.
Depending on the context a `node` can be
a [Block](http://asciidoctor.github.io/asciidoctor.js/master/#block),
a [Section](http://asciidoctor.github.io/asciidoctor.js/master/#section),
a [List](http://asciidoctor.github.io/asciidoctor.js/master/#list).
or a `Table`. `Block`, `Section`, `List` and `Table` extends [AbstractBlock](http://asciidoctor.github.io/asciidoctor.js/master/#abstractblock) which extends [AbstractNode](http://asciidoctor.github.io/asciidoctor.js/master/#abstractnode).  
If you want to learn more, please read the [Asciidoctor.js API documentation](http://asciidoctor.github.io/asciidoctor.js/2.0.3/).

To help you get started, we provides a few alternative layouts in the `examples` directory:

| Layout                    | Template file                                                                     |
| ------------------------- |---------------------------------------------------------------------------------- |
| **Letter**                | [`examples/letter/template.js`](examples/letter/template.js)                      |
| **Book**                  | [`examples/book/template.js`](examples/book/template.js)                          |
| **Slides**                | [`examples/slides/template.js`](examples/slides/template.js)                      |
| **Resume**                | [`examples/resume/template.js`](examples/resume/template.js)                      |
| **Cheat sheet (Snyk)**    | [`examples/cheat-sheet/snyk/template.js`](examples/cheat-sheet/snyk/template.js)  |

To enable a custom layout, use the `--template-require` command line option.
For instance, if I want to use the cheat sheet layout on `examples/cheat-sheet/maven-security-cheat-sheet.adoc`:

    $ asciidoctor-pdf ./examples/cheat-sheet/maven-security-cheat-sheet.adoc --template-require ./examples/cheat-sheet/snyk/template.js

It will produce a file named `examples/cheat-sheet/maven-security-cheat-sheet.pdf`.

## How does it work?

Asciidoctor PDF is using an HTML 5 converter to convert an AsciiDoc document to an HTML 5 page.
[Puppeteer](https://github.com/GoogleChrome/puppeteer) will then run an headless Chrome to generate a PDF from the HTML 5 page.

To paginate content in the browser, we are using [Paged.js](https://www.pagedmedia.org/paged-js/), 
an open-source library, that acts as a _polyfill_ for [Paged Media](https://www.w3.org/TR/css-page-3/) and [Generated Content for Paged Media](https://www.w3.org/TR/css-gcpm-3/) W3C specifications.

This project is heavily inspired by [ReLaXed](https://github.com/RelaxedJS/ReLaXed).

The file `template.js` defines how the AsciiDoc content should be converted to HTML 5.
Puppeteer will then run an headless Chrome to generate a PDF from the HTML 5 page.

## Contribute!

New contributors are always welcome!
If you discover errors or omissions in the source code or documentation, please don't hesitate to submit an issue or open a pull request with a fix.
