# Package the Node.js project into a single binary
FROM --platform=${TARGETPLATFORM:-linux/amd64} node:16.14.2-alpine3.15 as builder

# Workaround: https://github.com/nodejs/docker-node/issues/813#issuecomment-407339011
# Error: could not get uid/gid
# [ 'nobody', 0 ]
RUN npm config set unsafe-perm true

RUN npm install -g pkg@5.6.0 pkg-fetch@3.3.0

ENV NODE node16
ENV PLATFORM alpine
RUN /usr/local/bin/pkg-fetch -n ${NODE} -p ${PLATFORM} -a $([ "$TARGETARCH" == "amd64" ] && echo "x64" || echo "$TARGETARCH")

COPY package.json package-lock.json /app/
COPY lib /app/lib
COPY bin /app/bin
COPY css /app/css
WORKDIR /app

RUN PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1 npm ci

RUN /usr/local/bin/pkg bin/asciidoctor-web-pdf --config package.json --targets ${NODE}-${PLATFORM}-$([ "$TARGETARCH" == "amd64" ] && echo "x64" || echo "$TARGETARCH") -o app.bin

# Create the image
FROM --platform=${TARGETPLATFORM:-linux/amd64} alpine:3.15

RUN apk add --quiet --no-cache --update chromium

COPY --from=builder /app/app.bin /usr/bin/asciidoctor-web-pdf

ENV PUPPETEER_EXECUTABLE_PATH=/usr/lib/chromium/chrome

ENTRYPOINT ["/usr/bin/asciidoctor-web-pdf"]
