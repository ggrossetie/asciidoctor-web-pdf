import fs from 'node:fs'
import { createRequire } from 'node:module'
import ospath from 'node:path'
import { SyntaxHighlighter, SyntaxHighlighterBase } from '@asciidoctor/core'
import hljs from 'highlight.js'

const require = createRequire(import.meta.url)

const isSea = (() => {
  try {
    return require('node:sea').isSea()
  } catch {
    return false
  }
})()

function getHighlightJsStylesDir() {
  if (isSea) {
    return ospath.join(ospath.dirname(process.execPath), 'assets', 'highlight', 'styles')
  }
  return ospath.join(ospath.dirname(require.resolve('highlight.js/package.json')), 'styles')
}

const highlightJsStylesDir = getHighlightJsStylesDir()

// Server-side syntax highlighter: highlight.js runs in Node.js during Asciidoctor
// conversion so spans are already in the HTML when Vivliostyle processes it.
// Vivliostyle computes CSS cascade before scripts run, so client-side approaches
// cannot colorize dynamically-created spans.
class ServerHighlightJsAdapter extends SyntaxHighlighterBase {
  constructor(name, backend, opts) {
    super(name, backend, opts)
    this.name = 'highlight.js'
    this._preClass = 'highlightjs'
  }

  handlesHighlighting() {
    return true
  }

  highlight(node, source, lang, opts) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(source, { language: lang, ignoreIllegals: true }).value
    }
    return hljs.highlightAuto(source).value
  }

  hasDocinfo(location) {
    return location === 'head'
  }

  docinfo(location, doc, opts) {
    const theme = doc.getAttribute('highlightjs-theme') || 'github'
    const cssPath = ospath.join(highlightJsStylesDir, `${theme}.min.css`)
    const css = fs.readFileSync(cssPath, 'utf8')
    return `<style>${css}</style>`
  }
}

SyntaxHighlighter.register(ServerHighlightJsAdapter, 'highlight.js', 'highlightjs')