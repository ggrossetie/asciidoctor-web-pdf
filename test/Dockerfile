FROM node:24-bookworm-slim

RUN addgroup --gid 1001 asciidoc && adduser --disabled-password --ingroup asciidoc -u 1001 asciidoc

RUN apt-get update \
    && apt-get install -y chromium ca-certificates fonts-liberation poppler-utils \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

USER asciidoc
WORKDIR /app

COPY --chown=asciidoc:asciidoc package.json package-lock.json ./
RUN npm ci --cache /tmp/npm-cache && rm -rf /tmp/npm-cache

COPY --chown=asciidoc:asciidoc lib ./lib
COPY --chown=asciidoc:asciidoc bin ./bin
COPY --chown=asciidoc:asciidoc css ./css
COPY --chown=asciidoc:asciidoc fonts ./fonts
COPY --chown=asciidoc:asciidoc test ./test

ENV DEBUG=1
CMD npm t