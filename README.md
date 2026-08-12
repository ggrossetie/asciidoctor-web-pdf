# Asciidoctor Web PDF

[![Build](https://github.com/ggrossetie/asciidoctor-web-pdf/actions/workflows/build.yml/badge.svg?branch=main)](https://github.com/ggrossetie/asciidoctor-web-pdf/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/asciidoctor-pdf.svg)](https://www.npmjs.org/package/asciidoctor-pdf)
[![Docker image](https://img.shields.io/docker/v/ggrossetie/asciidoctor-web-pdf?label=Docker%20image)](https://hub.docker.com/r/ggrossetie/asciidoctor-web-pdf)

A PDF converter for AsciiDoc based on web technologies.
It allows complex layouts to be defined with CSS and JavaScript, while writing the content in AsciiDoc.

<table>
  <tr align="center">
    <td width="25%">
      <a href="https://github.com/ggrossetie/asciidoctor-web-pdf/blob/main/examples/document/document.pdf">
        <img src="https://github.com/ggrossetie/asciidoctor-web-pdf/raw/main/examples/document/document_screenshot.png" />
      </a>
    </td>
    <td width="25%">
      <a href="https://github.com/ggrossetie/asciidoctor-web-pdf/blob/main/examples/letter/letter.pdf">
        <img src="https://github.com/ggrossetie/asciidoctor-web-pdf/raw/main/examples/letter/letter_screenshot.png" />
      </a>
    </td>
    <td width="25%">
      <a href="https://github.com/ggrossetie/asciidoctor-web-pdf/blob/main/examples/book/book.pdf">
        <img src="https://github.com/ggrossetie/asciidoctor-web-pdf/raw/main/examples/book/book_screenshot.png" />
      </a>
    </td>
    <td width="25%">
      <a href="https://github.com/ggrossetie/asciidoctor-web-pdf/blob/main/examples/cheat-sheet/maven-security-cheat-sheet.pdf">
      <img src="https://github.com/ggrossetie/asciidoctor-web-pdf/raw/main/examples/cheat-sheet/maven-security-cheat-sheet_screenshot.png" />
      </a>
    </td>
  </tr>
  <tr align="center">
    <td with="25%">
      Document<br/>
      <a href="https://github.com/ggrossetie/asciidoctor-web-pdf/tree/main/examples/document/"> source </a> /
      <a href="https://github.com/ggrossetie/asciidoctor-web-pdf/blob/main/examples/document/document.pdf"> PDF </a>
    </td>
    <td with="25%">
      Letter<br/>
      <a href="https://github.com/ggrossetie/asciidoctor-web-pdf/tree/main/examples/letter/"> Source </a> /
      <a href="https://github.com/ggrossetie/asciidoctor-web-pdf/blob/main/examples/letter/letter.pdf"> PDF </a>
    </td>
    <td with="25%">
      Book<br/>
      <a href="https://github.com/ggrossetie/asciidoctor-web-pdf/tree/main/examples/book/"> source </a> /
      <a href="https://github.com/ggrossetie/asciidoctor-web-pdf/blob/main/examples/book/book.pdf"> PDF </a>
    </td>
    <td with="25%">
      Cheat sheet<br/>
      <a href="https://github.com/ggrossetie/asciidoctor-web-pdf/tree/main/examples/cheat-sheet/"> Source </a> /
      <a href="https://github.com/ggrossetie/asciidoctor-web-pdf/blob/main/examples/cheat-sheet/maven-security-cheat-sheet.pdf"> PDF </a>
    </td>
  </tr>
</table>
<table>
  <tr align="center">
    <td width="25%">
      <a href="https://github.com/ggrossetie/asciidoctor-web-pdf/blob/main/examples/resume/resume.pdf">
        <img src="https://github.com/ggrossetie/asciidoctor-web-pdf/raw/main/examples/resume/resume_screenshot.png" />
      </a>
    </td>
    <td width="25%">
      <a href="https://github.com/ggrossetie/asciidoctor-web-pdf/blob/main/examples/presentation/ioslides/presentation.pdf">
        <img src="https://github.com/ggrossetie/asciidoctor-web-pdf/raw/main/examples/presentation/ioslides/presentation_screenshot.png" />
      </a>
    </td>
    <td width="25%"></td>
    <td width="25%"></td>
  </tr>
  <tr align="center">
    <td width="25%">
      Resume<br/>
      <a href="https://github.com/ggrossetie/asciidoctor-web-pdf/tree/main/examples/resume/"> Source </a> /
      <a href="https://github.com/ggrossetie/asciidoctor-web-pdf/blob/main/examples/resume/resume.pdf"> PDF </a>
    </td>
    <td width="25%">
      Presentation<br/>
      <a href="https://github.com/ggrossetie/asciidoctor-web-pdf/tree/main/examples/presentation/ioslides/"> Source </a> /
      <a href="https://github.com/ggrossetie/asciidoctor-web-pdf/blob/main/examples/presentation/ioslides/presentation.pdf"> PDF </a>
    </td>
    <td width="25%"></td>
    <td width="25%"></td>
  </tr>
</table>

Asciidoctor Web PDF has support for LaTeX-style mathematical equations (via [MathJax](https://www.mathjax.org/)) and syntax highlighting (via [highlight.js](https://highlightjs.org/)).
Many more features can be added by importing an existing JavaScript or CSS framework.

## Quick start

```sh
npm i -g asciidoctor-pdf
asciidoctor-web-pdf document.adoc
```

Or with Docker:

```sh
docker run --rm ggrossetie/asciidoctor-web-pdf --version
```

## Documentation

The full documentation lives in [`docs/`](docs/modules/ROOT/pages/index.adoc), structured as an Antora component:

- [Introduction](docs/modules/ROOT/pages/index.adoc)
- [Installation](docs/modules/ROOT/pages/installation.adoc)
- [Get started](docs/modules/ROOT/pages/get-started.adoc)
- Configuration: [STEM support](docs/modules/ROOT/pages/configure-stem.adoc), [title page](docs/modules/ROOT/pages/configure-title-page.adoc), [custom styles](docs/modules/ROOT/pages/configure-custom-styles.adoc), [front cover image](docs/modules/ROOT/pages/configure-front-cover-image.adoc), [docinfo](docs/modules/ROOT/pages/configure-docinfo.adoc), [running elements](docs/modules/ROOT/pages/configure-running-elements.adoc), [Asciidoctor extensions](docs/modules/ROOT/pages/configure-extensions.adoc), [diagrams](docs/modules/ROOT/pages/configure-diagrams.adoc)
- [Custom layout](docs/modules/ROOT/pages/custom-layout.adoc)
- [How does it work?](docs/modules/ROOT/pages/how-it-works.adoc)

## Contribute!

New contributors are always welcome!
If you discover errors or omissions in the source code or documentation, please don't hesitate to submit an issue or open a pull request with a fix.
See [CONTRIBUTING.adoc](CONTRIBUTING.adoc) to set up your development environment.
