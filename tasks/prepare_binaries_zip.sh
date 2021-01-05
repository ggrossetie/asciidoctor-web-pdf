#!/bin/bash

# copy subfolders and create zip file for each os
# NOTE: Intended to be run from the _project root only_

set -ex

BUILD_DIR=build

for os in linux win mac
do
  echo "Preparing zip file binaries for ${os}"
  cd "${BUILD_DIR}/${os}" && zip --quiet -r "asciidoctor-web-pdf-${os}" * && cd ../..
done
