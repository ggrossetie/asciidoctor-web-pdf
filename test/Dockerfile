FROM node:16.16.0-bullseye-slim

RUN addgroup --gid 1001 asciidoc && adduser --disabled-password --ingroup asciidoc -u 1001 asciidoc

RUN apt-get update \
    && apt-get install -y gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libgbm-dev libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libnss3 lsb-release xdg-utils poppler-utils wget \
    && rm -rf /var/lib/apt/lists/*

USER asciidoc
WORKDIR /app

COPY --chown=asciidoc:asciidoc package.json package-lock.json ./
RUN npm ci && npm cache clean --force

COPY --chown=asciidoc:asciidoc lib ./lib
COPY --chown=asciidoc:asciidoc bin ./bin
COPY --chown=asciidoc:asciidoc css ./css
COPY --chown=asciidoc:asciidoc fonts ./fonts
COPY --chown=asciidoc:asciidoc test ./test

ENV DEBUG=1
CMD npm t
