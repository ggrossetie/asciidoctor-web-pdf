# README

This folder contains various produced documents. Command-line examples given below show how to generate them:

```console
# basic-example.{html,pdf}
$ asciidoctor-web-pdf basic-example.adoc

# document.{html,pdf}
$ asciidoctor-web-pdf document.adoc

# orly.{html,pdf}
$ asciidoctor-web-pdf orly.adoc -a stylesheet="+./orly.css"

# report.{html,pdf}
$ asciidoctor-web-pdf report.adoc -a stylesheet="+./report.css"

# piracy.{html,pdf}
$ npm i asciidoctor-kroki
$ asciidoctor-web-pdf --require asciidoctor-kroki piracy.adoc 
```
