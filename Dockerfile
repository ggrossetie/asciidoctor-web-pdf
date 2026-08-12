# Build the SEA binary
FROM node:24-bookworm-slim AS builder

# Chrome system libs are required by the smoke test that runs at the end of npm run build
RUN apt-get update \
    && apt-get install -y chromium unzip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN PUPPETEER_SKIP_DOWNLOAD=true npm ci --cache /tmp/npm-cache && rm -rf /tmp/npm-cache

COPY lib ./lib
COPY bin ./bin
COPY css ./css
COPY examples ./examples
COPY fonts ./fonts
COPY tasks ./tasks

RUN npm run build && \
    PLATFORM_DIR=$(find build -maxdepth 1 -type d \( -name 'linux-x64' -o -name 'linux-arm64' \) | head -1) && \
    test -n "$PLATFORM_DIR" && mv "$PLATFORM_DIR" build/output

# Create the final image
# Must use a glibc-based image (Debian/Ubuntu): the SEA binary embeds the Node.js runtime
# which is compiled against glibc. Alpine uses musl and cannot run the binary.
FROM debian:bookworm-slim

RUN addgroup --gid 1000 asciidoctor && adduser --disabled-password --ingroup asciidoctor -u 1000 asciidoctor

RUN apt-get update \
    && apt-get install -y chromium fonts-noto-color-emoji fonts-freefont-ttf \
    && fc-cache -f \
    && rm -rf /var/lib/apt/lists/*

COPY --chown=asciidoctor:asciidoctor --from=builder /app/build/output/asciidoctor-web-pdf /usr/bin/asciidoctor-web-pdf
COPY --chown=asciidoctor:asciidoctor --from=builder /app/build/output/viewer/ /usr/bin/viewer/
COPY --chown=asciidoctor:asciidoctor --from=builder /app/build/output/assets/ /usr/bin/assets/
COPY --chown=asciidoctor:asciidoctor --from=builder /app/build/output/css/ /usr/bin/css/
COPY --chown=asciidoctor:asciidoctor --from=builder /app/build/output/examples/ /usr/bin/examples/
COPY --chown=asciidoctor:asciidoctor --from=builder /app/build/output/fonts/ /usr/bin/fonts/

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN mkdir /usr/app && chown asciidoctor:asciidoctor /usr/app

USER asciidoctor
WORKDIR /usr/app

ENTRYPOINT ["/usr/bin/asciidoctor-web-pdf"]