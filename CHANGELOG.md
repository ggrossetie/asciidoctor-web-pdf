# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

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

### Fixed

- Long unbroken words (e.g. a fully-qualified class name) in a table cell no longer overflow past the page edge; they now wrap ([#164](https://github.com/ggrossetie/asciidoctor-web-pdf/issues/164))
- Sidebar and example blocks no longer split across a page break ([#374](https://github.com/ggrossetie/asciidoctor-web-pdf/issues/374))
- The document subtitle is now rendered distinctly from the main title on the title page, instead of being merged into the same heading ([#699](https://github.com/ggrossetie/asciidoctor-web-pdf/issues/699))
