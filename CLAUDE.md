# asciidoctor-web-pdf

A PDF converter for AsciiDoc based on web technologies (Node.js + Puppeteer).

## Architecture

### Conversion pipeline

1. **Asciidoctor** converts `.adoc` → HTML (via `lib/converter.js` + `lib/document/document-converter.js`)
2. The HTML is written to a temporary `.html` file
3. **Puppeteer** opens the **Vivliostyle Viewer** (`@vivliostyle/viewer`) pointing at that file (`lib/browser.js`)
4. The viewer renders the document into CSS paged media layout
5. Puppeteer prints the rendered DOM to PDF via `page.pdf({ preferCSSPageSize: true })`
6. **pdf-lib** post-processes the PDF to add outline (bookmarks) and metadata

### Key source files

| File | Role |
|------|------|
| `lib/cli.js` | CLI entry point (argument parsing, watch mode) |
| `lib/converter.js` | Orchestrates Asciidoctor + Puppeteer conversion; builds the Vivliostyle viewer URL |
| `lib/browser.js` | Puppeteer browser management; waits for `data-vivliostyle-viewer-status === "complete"` |
| `lib/document/document-converter.js` | Custom Asciidoctor converter; generates the HTML document (content + CSS); invokes stem and syntax-highlighter processing |
| `lib/document/stem.js` | Server-side MathJax 4 rendering: processes TeX/AsciiMath expressions in the HTML and replaces them with CHTML markup before the page is written to disk |
| `lib/document/syntax-highlighter.js` | Server-side highlight.js adapter: syntax-highlights source blocks during Asciidoctor conversion and inlines the theme CSS |
| `lib/outline.js` | Generates PDF bookmarks from section headings; encodes destinations in Vivliostyle's format |
| `lib/metadata.js` | Injects PDF metadata (title, author, etc.) |
| `css/document.css` | Core print CSS: page size, margins, TOC numbering, footnotes |
| `css/asciidoctor.css` | AsciiDoc document styles |
| `css/features/title-page.css` | Styles for documents with a title page (`book` doctype or `:title-page:`) |
| `css/features/book.css` | Styles for `book` doctype (chapter breaks, page numbering) |
| `css/features/title-document-numbering.css` | Page numbering for documents without a title page |
| `tasks/prepare-binaries.js` | Build script: bundles app with esbuild, creates Node SEA binaries |

### How the HTML page is structured

`document-converter.js` produces a clean HTML page with:
- Inline `<style>` containing `asciidoctor.css` + `document.css` + feature CSS
- Math expressions already rendered as CHTML markup (when `:stem:` is set), with the MathJax CHTML stylesheet inlined in `<head>`
- Syntax-highlighted source blocks with the highlight.js theme CSS inlined in `<head>` (when a source block is present)
- A hidden outline `<div>` with `visibility:hidden; position:fixed` containing `<a href="#section-id">` links for each section — required for Chromium to create PDF named destinations

There is **no Vivliostyle JavaScript** in the generated HTML. The Vivliostyle viewer is a separate standalone app that loads the HTML as a source document.

### Vivliostyle viewer integration

`converter.js` builds a viewer URL of the form:
```
file:///path/to/vivliostyle-viewer/lib/index.html#src=file:///path/to/doc.html&bookMode=false&renderAllPages=true&spread=false
```

- `bookMode=false` — single HTML document (not EPUB/Web publication)
- `renderAllPages=true` — render all pages before signaling complete (required for PDF)
- `spread=false` — single page view

The viewer's `@media print` CSS automatically hides the viewer UI, showing only the rendered document content.

The path to the document is resolved via `fs.realpathSync` to expand symlinks (on macOS `/tmp` → `/private/tmp`), ensuring the URL matches what Chromium uses internally when creating PDF named destinations.

### Waiting for render completion

`lib/browser.js` uses Puppeteer's `waitForFunction` to poll:
```js
'document.body.getAttribute("data-vivliostyle-viewer-status") === "complete"'
```
The Vivliostyle viewer sets this attribute on `<body>` when all pages are rendered.

### PDF outline (bookmarks)

Vivliostyle creates PDF named destinations in the format:
```
viv-id-<encoded-url>#<section-id>
```
where non-`[A-Za-z0-9_-]` characters in the URL are replaced by `:XXXX` (4-digit lowercase hex).

`lib/outline.js` encodes destination IDs in this format using the source document URL passed from `converter.js`.

### MathJax

MathJax 4 (CHTML output) runs **server-side in Node.js** during conversion, not in the browser. `lib/document/stem.js` receives the rendered HTML from `document-converter.js`, finds TeX (`\(...\)`, `\[...\]`) and AsciiMath (`\$...\$`) delimiters, converts each expression to CHTML using `mathjax` npm package, and appends the MathJax CHTML stylesheet to `<head>`.

CHTML fonts are loaded by Chromium at render time as `file://` URLs pointing to `assets/mathjax-fonts/` (woff2 files from `@mathjax/mathjax-newcm-font`).

MathJax component JS files (`input/tex`, `input/asciimath`, `output/chtml` and their extensions) are loaded dynamically by Node.js via `require()` at the first stem conversion. In SEA mode these files live in `assets/mathjax/` next to the binary; a `package.json` with `"type":"commonjs"` is placed there to prevent Node.js from inheriting `"type":"module"` from a parent directory (which would run the legacy `asciimath.js` code in strict ESM mode and break its `arguments.callee` usage).

`output/chtml` also `require()`s the `@mathjax/mathjax-newcm-font` component server-side for glyph metrics (`chtml.js`, plus per-script files under `chtml/dynamic/` such as `greek.js`/`cyrillic.js`, loaded on demand) — separate from the woff2 files below, which are only for Chromium's CSS. In SEA mode these live in `assets/mathjax-newcm-font/`.

### Syntax highlighting

`lib/document/syntax-highlighter.js` registers a server-side highlight.js adapter with Asciidoctor. Source blocks are highlighted during conversion (spans already in the HTML when Vivliostyle processes it) and the chosen theme CSS (default: `github`) is inlined in `<head>`. Theme files are read from `node_modules/highlight.js/styles/` at runtime, or from `assets/highlight/styles/` in SEA mode.

### Binary distribution (Node SEA)

`tasks/prepare-binaries.js`:
1. Bundles the app with **esbuild** into `build/bundle.js`
2. Creates a Node SEA blob (`node --experimental-sea-config`)
3. Copies the blob into a Node.js binary
4. Copies runtime assets alongside the binary

Assets copied alongside the binary (all resolved relative to `path.dirname(process.execPath)`):

| Path | Purpose |
|------|---------|
| `viewer/` | Full `@vivliostyle/viewer/lib/` directory — served via `file://` to Chromium |
| `assets/mathjax/` | MathJax component JS files loaded by Node.js via `require()` at runtime (`input/tex.js`, `input/asciimath.js`, `output/chtml.js`, extensions). Includes a `package.json {"type":"commonjs"}` to prevent ESM mode inheritance. |
| `assets/mathjax-fonts/` | CHTML woff2 fonts from `@mathjax/mathjax-newcm-font` — served as `file://` URLs to Chromium |
| `assets/mathjax-newcm-font/` | `@mathjax/mathjax-newcm-font`'s `chtml.js` + `chtml/dynamic/` component, loaded by Node.js via `require()` for server-side glyph metrics. Includes a `package.json {"type":"commonjs"}` for the same reason as `assets/mathjax/`. |
| `assets/highlight/styles/` | highlight.js CSS theme files read by the server-side syntax highlighter |
| `css/` | Stylesheet files |
| `examples/` | Example documents |
| `fonts/` | Font files |

In SEA mode, the viewer index path is `path.join(path.dirname(process.execPath), 'viewer', 'index.html')`.

**MathJax loader wiring** (`lib/document/stem.js`): before the first `MathJax.init()` call, overrides are applied to the loader config:
- `config.loader.require` → CJS `require`, always, on every platform. The default `eval("(file) => import(file)")` uses dynamic ESM `import()`, which does not work in a SEA/CJS-only context, and also fails on Windows for plain drive-letter paths (`C:/...`) since Node's ESM loader requires a `file://` URL there.
- `config.loader.paths.mathjax` → `assets/mathjax/`, SEA-only (esbuild sets `__dirname` to the binary dir, making `node-main.js` compute the wrong root)
- `config.loader.paths['mathjax-newcm']` → `assets/mathjax-newcm-font/`, SEA-only, for the same reason

**Runtime `require()` of npm packages vs. `import`**: a package that's only ever loaded via a *runtime* `require()` call (through `createRequire`, as MathJax components are, since their paths are resolved dynamically at `init()` time) is never bundled by esbuild — it stays a real filesystem lookup, which fails once the SEA binary ships without its build machine's `node_modules`. `lib/browser.js`'s use of `@puppeteer/browsers` to compute the Chromium executable path in SEA mode uses a static `import` instead, specifically so esbuild inlines it into the binary. `tasks/prepare-binaries.js`'s smoke test runs the built binary from a directory copied outside the repo (no ancestor `node_modules`) to catch this class of bug — running it in place would silently pass by resolving through the repo's own `node_modules`.

## Development

```sh
npm install
npm test           # smoke test + JS tests
npm run test:js    # unit/integration tests only
npm run lint       # Biome linter
npm run format     # Biome formatter
npm run build      # build SEA binary for the current platform
```

Tests use Node's built-in `node:test` runner. Visual regression tests compare PDF output against reference images in `test/reference/`.