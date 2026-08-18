# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

## [1.0.1] - 2026-08-17

### Changed

- The release workflow run title now includes the version number being released, making it easier to identify runs in the Actions list

### Fixed

- `:stem:` no longer fails to load MathJax on Windows with `Only URLs with a scheme in: file, data, and node are supported by the default ESM loader`
- Binaries no longer fail with `Cannot find module '@puppeteer/browsers'` (or, for documents using `:stem:` with Greek/Cyrillic/etc. characters, `Cannot find module '@mathjax/mathjax-newcm-font/chtml.js'`) when run outside of a development checkout; the build now smoke-tests the binary from an isolated directory to catch this class of bug
- Binaries no longer fail with `ENOENT: no such file or directory, open '.../package.json'` when run with `--version`; the smoke test now also runs `--version` to catch this class of bug

## [1.0.0] - 2026-08-15

### Added

- New documentation site built with Antora ([#731](https://github.com/ggrossetie/asciidoctor-web-pdf/pull/731))
- Binaries are now built as Node.js Single Executable Applications (SEA), replacing `pkg`, adding native macOS and Linux arm64 support ([#723](https://github.com/ggrossetie/asciidoctor-web-pdf/pull/723))
- A `generator` meta tag with the current version is now included in the document `<head>`, useful for debugging ([#300](https://github.com/ggrossetie/asciidoctor-web-pdf/issues/300))

### Changed

- Replaced the Paged.js rendering engine with the Vivliostyle Viewer for CSS paged media layout, fixing numerous long-standing page layout issues (page numbering, TOC dot leaders, tables/images spanning pages, and more) ([#725](https://github.com/ggrossetie/asciidoctor-web-pdf/pull/725))
- The `backend` attribute is now set to `pdf` ([#736](https://github.com/ggrossetie/asciidoctor-web-pdf/pull/736))
- Switched linting/formatting to Biome and the test suite to Node's built-in test runner ([#721](https://github.com/ggrossetie/asciidoctor-web-pdf/pull/721), [#720](https://github.com/ggrossetie/asciidoctor-web-pdf/pull/720))
- Migrated the release process to a manually triggered GitHub Actions workflow with npm trusted publishing ([#722](https://github.com/ggrossetie/asciidoctor-web-pdf/pull/722))
- The release workflow now rolls this changelog into a dated release section and uses it as the GitHub release notes
- README now links to the published documentation site instead of duplicating the table of contents
- The CI Docker image build now uses a GitHub Actions cache, speeding up the `check` job
- `convert()` in `lib/converter.js` now takes a single `config` object (`timings`, `watch`, `preview`, `verbose`, `preserveHtml`, `preprocessScripts`, `browser`) instead of eight positional boolean/flag arguments; all functions in `lib/converter.js` are now documented with JSDoc

### Fixed

- Long unbroken words (e.g. a fully-qualified class name) in a table cell no longer overflow past the page edge; they now wrap ([#164](https://github.com/ggrossetie/asciidoctor-web-pdf/issues/164))
- Sidebar and example blocks no longer split across a page break ([#374](https://github.com/ggrossetie/asciidoctor-web-pdf/issues/374))
- The document subtitle is now rendered distinctly from the main title on the title page, instead of being merged into the same heading ([#699](https://github.com/ggrossetie/asciidoctor-web-pdf/issues/699))
- Collapsible blocks (`[%collapsible]`) are now always rendered expanded, since a static PDF has no way to expand a collapsed one ([#241](https://github.com/ggrossetie/asciidoctor-web-pdf/issues/241))
- `:toc-placement: preamble` now places the ToC after the preamble for the book doctype instead of being ignored in favor of the header ToC ([#492](https://github.com/ggrossetie/asciidoctor-web-pdf/issues/492))
- Referencing the same footnote more than once no longer duplicates it at the bottom of the page; the repeat reference now links back to the original ([#664](https://github.com/ggrossetie/asciidoctor-web-pdf/issues/664))
- Tables with `frame=all` now show their outer border again when `grid` is anything other than `all` (e.g. `grid=rows`) ([#676](https://github.com/ggrossetie/asciidoctor-web-pdf/issues/676))
- The revision number, date and remark are now rendered on the title page when set ([#84](https://github.com/ggrossetie/asciidoctor-web-pdf/issues/84))
- When converting several documents against a shared browser instance (e.g. `--watch` across multiple files), each document is now rendered in a clean page instead of silently reusing stale content from the previous one
