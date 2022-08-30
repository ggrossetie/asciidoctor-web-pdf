FROM ghcr.io/puppeteer/puppeteer:17.0.0
# LABEL org.opencontainers.image.authors="Mogztter#Guillaume Grossetie"
LABEL version="17.0.0"
LABEL description="This docker image contains \
asciidoctor-web-pdf to generate websites and pdf from asciidoc(tor)."

ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome

USER root
WORKDIR /usr/src/app

RUN npm install -g @asciidoctor/core asciidoctor-pdf --save-dev
