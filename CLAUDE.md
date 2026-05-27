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
| `lib/document/document-converter.js` | Custom Asciidoctor converter; generates the HTML document (content + CSS + optional MathJax) |
| `lib/document/stem.js` | MathJax integration for math rendering (CHTML output) |
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
- Optional MathJax scripts (when `:stem:` is set)
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

MathJax (CHTML output, `tex-chtml-full.js`) is injected into the HTML document when `:stem:` is set. It executes inside Vivliostyle's source document context and modifies the DOM before Vivliostyle completes layout.

Note: SVG output was previously used as a workaround for an old architecture where the DOM was cloned into a blob URL (stripping CHTML's dynamically-injected styles). That workaround is no longer needed.

### Binary distribution (Node SEA)

`tasks/prepare-binaries.js`:
1. Bundles the app with **esbuild** into `build/bundle.js`
2. Creates a Node SEA blob (`node --experimental-sea-config`)
3. Copies the blob into a Node.js binary
4. Copies runtime assets alongside the binary

Assets that must be file-accessible from Chromium (not bundled):
- `viewer/` — full `@vivliostyle/viewer/lib/` directory
- `assets/mathjax/` — MathJax ES5 bundle
- `css/` — stylesheet files

In SEA mode, the viewer index path is `path.join(path.dirname(process.execPath), 'viewer', 'index.html')`.

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