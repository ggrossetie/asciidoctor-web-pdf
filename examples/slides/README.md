# README

Generate `slides.html` and `slides.pdf` by invoking `asciidoctor-web-pdf` as shown below from the command-line:

```console
$ asciidoctor-web-pdf slides.adoc --template-require ./template.js
```

You can use the exact same `template.js` file to generate Google I/O inspired slides.
Open a terminal and type:

```console
$ asciidoctor-web-pdf ioslides/presentation.adoc --template-require ./template.js
```

The above command will generate both `ioslides/presentation.html` and `ioslides/presentation.pdf`.
As you can see, we have generated a completely different output from the same HTML structure using only CSS.
If you need inspiration, you can take a look at `ioslides/styles/main.css`.
