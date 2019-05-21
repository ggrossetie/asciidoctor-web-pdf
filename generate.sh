#!/bin/bash

asciidoctor examples/quarkus-cheat-sheet/site.adoc -o ./docs/index.html
./bin/asciidoctorjs-pdf examples/quarkus-cheat-sheet/quarkus-cheat-sheet.adoc --template-require ../examples/quarkus-cheat-sheet/redhat/template.js

open ./docs/index.html
open examples/quarkus-cheat-sheet/quarkus-cheat-sheet.pdf
