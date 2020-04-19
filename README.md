# Asciidoctor PDF

[![Build](https://github.com/Mogztter/asciidoctor-pdf.js/workflows/Build/badge.svg)](https://github.com/Mogztter/asciidoctor-pdf.js/actions?query=workflow%3ABuild)
[![npm version](https://img.shields.io/npm/v/asciidoctor-pdf.svg)](https://www.npmjs.org/package/asciidoctor-pdf)

A PDF converter for AsciiDoc based on web technologies.
It allows complex layouts to be defined with CSS and JavaScript, while writing the content in AsciiDoc.

<table>
  <tr align="center">
    <td width="25%">
      <a href="https://github.com/Mogztter/asciidoctor-pdf.js/blob/master/examples/document/document.pdf">
        <img src="https://github.com/Mogztter/asciidoctor-pdf.js/raw/master/examples/document/document_screenshot.png" />
      </a>
    </td>
    <td width="25%">
      <a href="https://github.com/Mogztter/asciidoctor-pdf.js/blob/master/examples/letter/letter.pdf">
        <img src="https://github.com/Mogztter/asciidoctor-pdf.js/raw/master/examples/letter/letter_screenshot.png" />
      </a>
    </td>
    <td width="25%">
      <a href="https://github.com/Mogztter/asciidoctor-pdf.js/blob/master/examples/book/book.pdf">
        <img src="https://github.com/Mogztter/asciidoctor-pdf.js/raw/master/examples/book/book_screenshot.png" />
      </a>
    </td>
    <td width="25%">
      <a href="https://github.com/Mogztter/asciidoctor-pdf.js/blob/master/examples/cheat-sheet/maven-security-cheat-sheet.pdf">
      <img src="https://github.com/Mogztter/asciidoctor-pdf.js/raw/master/examples/cheat-sheet/maven-security-cheat-sheet_screenshot.png" />
      </a>
    </td>
  </tr>
  <tr align="center">
    <td with="25%">
      Document<br/>
      <a href="https://github.com/Mogztter/asciidoctor-pdf.js/tree/master/examples/document/"> source </a> /
      <a href="https://github.com/Mogztter/asciidoctor-pdf.js/blob/master/examples/document/document.pdf"> PDF </a>
    </td>
    <td with="25%">
      Letter<br/>
      <a href="https://github.com/Mogztter/asciidoctor-pdf.js/tree/master/examples/letter/"> Source </a> /
      <a href="https://github.com/Mogztter/asciidoctor-pdf.js/blob/master/examples/letter/letter.pdf"> PDF </a>
    </td>
    <td with="25%">
      Book<br/>
      <a href="https://github.com/Mogztter/asciidoctor-pdf.js/tree/master/examples/book/"> source </a> /
      <a href="https://github.com/Mogztter/asciidoctor-pdf.js/blob/master/examples/book/book.pdf"> PDF </a>
    </td>
    <td with="25%">
      Cheat sheet<br/>
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
    </td>
    <td width="25%">
      <a href="https://github.com/Mogztter/asciidoctor-pdf.js/blob/master/examples/slides/ioslides/presentation.pdf">
        <img src="https://github.com/Mogztter/asciidoctor-pdf.js/raw/master/examples/slides/ioslides/presentation_screenshot.png" />
      </a>
    </td>
    <td width="25%"></td>
    <td width="25%"></td>
  </tr>
  <tr align="center">
    <td width="25%">
      Resume<br/>
      <a href="https://github.com/Mogztter/asciidoctor-pdf.js/tree/master/examples/resume/"> Source </a> /
      <a href="https://github.com/Mogztter/asciidoctor-pdf.js/blob/master/examples/resume/resume.pdf"> PDF </a>
    </td>
    <td width="25%">
      Slides<br/>
      <a href="https://github.com/Mogztter/asciidoctor-pdf.js/tree/master/examples/slides/ioslides/"> Source </a> /
      <a href="https://github.com/Mogztter/asciidoctor-pdf.js/blob/master/examples/slides/ioslides/presentation.pdf"> PDF </a>
    </td>
    <td width="25%"></td>
    <td width="25%"></td>
  </tr>
</table>

Asciidoctor PDF has support for LaTeX-style mathematical equations (via [MathJax](https://www.mathjax.org/)) and syntax highlighting (via [highlight.js](https://highlightjs.org/)).
Many more features can be added by importing an existing JavaScript or CSS framework.

## Highlights

- Complex layouts with CSS and JavaScript
- SVG icons with Font Awesome 5
- PDF document outline (i.e., bookmarks)
- Table Of Contents
- Document metadata (title, authors, subject, keywords, etc)
- Fully customizable template
- Syntax highlighting with Highlight.js
- Page numbering
- Preview mode
- STEM support with MathJax 3

## Installation

### Requirements

You need [Node](https://nodejs.org) installed on your machine to install and run Asciidoctor PDF.
The best way to install Node is to use _nvm_ (Node Version Manager).

<details>
<summary>How to set up nvm on my machine</summary>
<br/>

**Install nvm and Node on Linux or macOS**

Follow these [installation instructions](https://github.com/nvm-sh/nvm#installation-and-update) to set up nvm on your machine. <br/>
Once you've installed nvm, open a new terminal and install the latest Node LTS release.

    $ nvm install --lts

The above command will install the latest LTS release of Node and automatically set it as your default alias.

**Install nvm and Node on Windows**

Follow these [installation instructions](https://github.com/coreybutler/nvm-windows#installation--upgrades) to set up nvm on your machine. <br/>
Once you've installed nvm, open an new, regular PowerShell terminal, and install Node using nvm.

    $ nvm install 12.13.0
    $ nvm use 12.13.0

The above commands will install Node v12.13.0 and enable it.
</details>

We recommend using the latest long term support (LTS) release of Node.
While you can use other versions of Node, Asciidoctor PDF is only tested against active LTS releases.

### Install globally using npm

To install Asciidoctor PDF package globally, open a terminal and type:

    $ npm i -g @asciidoctor/core asciidoctor-pdf

**NOTE:** We recommend installing Asciidoctor PDF globally to make the `asciidoctor-pdf` command available on your `PATH`.
However, you can also install Asciidoctor PDF in a project directory if you prefer.

Verify that the `asciidoctor-pdf` command is available on your `PATH` by running:

    $ asciidoctor-pdf --version

**NOTE:** If you get an error about [Executions Policies](https://go.microsoft.com/fwlink/?LinkID=135170) when running this command on PowerShell, try to use the following command instead: `$ asciidoctor-pdf.cmd --version`.

If installation was successful, the command should report the version of Asciidoctor PDF.

```console
$ asciidoctor-pdf --version
Asciidoctor PDF 1.0.0-alpha.4 using Asciidoctor.js 2.0.3 (Asciidoctor 2.0.9) [https://asciidoctor.org]
Runtime Environment (node v10.15.1 on linux)
CLI version 3.0.2
```

**NOTE:** If you prefer Yarn over npm, use this command to install the Asciidoctor PDF package:
```
$ yarn global add @asciidoctor/core asciidoctor-pdf
```

### Install in a project directory (alternative install)

You can opt to install Asciidoctor PDF in a project directory, such as the directory where your AsciiDoc files are stored.
To install Asciidoctor PDF in a project directory, move into your project directory and type:

    $ npm i @asciidoctor/core asciidoctor-pdf

Dropping the `-g` flag installs the package under the `node_modules` folder in the current directory.

Verify that the `asciidoctor-pdf` command is available by running `$(npm bin)/asciidoctor-pdf --version`.

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

**Custom styles**

You can provide a custom stylesheet using the `stylesheet` attribute. A custom stylesheet does completely replace the default stylesheet.

    $ asciidoctor-pdf document.adoc -a stylesheet="custom.css"

The `stylesheet` attribute can accept multiple comma delimited values (without spaces).
This can be used to begin with a base stylesheet and then apply supplementary content.

    $ asciidoctor-pdf document.adoc -a stylesheet="custom.css,override.css"

It's also possible to use the default stylesheet and add custom styles with a custom stylesheet. All default stylesheets are available under the prefix `asciidoctor-pdf/css/`:

    $ asciidoctor-pdf document.adoc -a stylesheet="asciidoctor-pdf/css/asciidoctor.css,asciidoctor-pdf/css/document.css,custom.css"

You can also specify where the stylesheets are located with the `stylesdir` attribute.

    $ asciidoctor-pdf document.adoc -a stylesdir=css -a stylesheet="custom.css,override.css"

**Asciidoctor extensions**

Asciidoctor PDF can use Asciidoctor extensions written in JavaScript from the CLI.
For instance, if you want to use the [Asciidoctor Kroki](https://github.com/mogztter/asciidoctor-kroki) extension, you first need to install it:

    $ npm i asciidoctor-kroki

Then, you can use the following command to load this extension:

    $ asciidoctor-pdf --require asciidoctor-kroki document.adoc

It's also possible to use an extension from a JavaScript file.
For instance, if you want to load a local extension declared in a JavaScript file named `my-asciidoctor-extension.js`, then you can use the following command:

    $ asciidoctor-pdf --require ./my-asciidoctor-extension.js document.adoc

**NOTE:** Please note that the extension should export a function named `register`, otherwise the extension won't be registered:

```js
module.exports.register = function (registry) {
  if (typeof registry.register === 'function') {
    registry.register(function () {
      this.block(function () {
        // ...
      })
    })
  } else if (typeof registry.block === 'function') {
    registry.block(function () {
      // ...
    })
  }
  return registry
}
```

**Diagrams**

You can use the [Asciidoctor Kroki extension](https://github.com/Mogztter/asciidoctor-kroki) to render diagrams in your PDF.
In this example, we create a file named `piracy.adoc` with the following content:

**piracy.adoc**
```
= Piracy

Piracy is an act of robbery or criminal violence by ship upon another ship,
typically with the goal of stealing rum and other valuable items or properties.

Here's what a pirate looks like!

[nomnoml]
....
[Pirate|eyeCount: Int|raid();pillage()|
  [beard]--[parrot]
  [beard]-:>[foul mouth]
]

[<abstract>Marauder]<:--[Pirate]
[Pirate]- 0..7[mischief]
[jollyness]->[Pirate]
[jollyness]->[rum]
[jollyness]->[singing]
[Pirate]-> *[rum|tastiness: Int|swig()]
[Pirate]->[singing]
[singing]<->[rum]
....
```

[Kroki](https://kroki.io/) supports more than a dozen diagram libraries.
In the above example, we are using the [nomnoml](https://github.com/skanaar/nomnoml) UML diagram library.

**NOTE:** Please note, that you will need to install `asciidoctor-kroki`, using `npm i asciidoctor-kroki`.

You can use the following command to generate a PDF:

    $ asciidoctor-pdf --require asciidoctor-kroki piracy.adoc

And here's the result: [piracy.pdf](https://github.com/Mogztter/asciidoctor-pdf.js/blob/master/examples/document/piracy.pdf)

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
