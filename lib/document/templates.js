const fs = require('fs')
const path = require('path')

const repeatTableHeadersContent = fs.readFileSync(`${__dirname}/repeating-table-headers.js`, 'utf8')
const pagedContent = fs.readFileSync(require.resolve('pagedjs/dist/paged.polyfill.js'), 'utf8')
const asciidoctorStyleContent = fs.readFileSync(`${__dirname}/asciidoctor.css`, 'utf8')
const documentStyleContent = fs.readFileSync(`${__dirname}/document.css`, 'utf8')
const titleDocumentStyleContent = fs.readFileSync(`${__dirname}/title-document-numbering.css`, 'utf8')
const titlePageStyleContent = fs.readFileSync(`${__dirname}/title-page-numbering.css`, 'utf8')

const customStyleContent = (node) => {
  const stylesheet = node.getAttribute('stylesheet')
  if (stylesheet && stylesheet !== '') {
    if (path.isAbsolute(stylesheet)) {
      return fs.readFileSync(stylesheet)
    }
    const stylesDirectory = node.getAttribute('stylesdir')
    let start = node.getDocument().getBaseDir()
    if (stylesDirectory) {
      if (path.isAbsolute(stylesDirectory)) {
        start = stylesDirectory
      } else {
        start = path.join(node.getDocument().getBaseDir(), stylesDirectory)
      }
    } else {
      start = node.getDocument().getBaseDir()
    }
    return fs.readFileSync(path.join(start, stylesheet))
  }
  return ''
}

const titlePageStyle = (node) => {
  if (hasTitlePage(node)) {
    // The page number start after the first page (ie. the title page)
    return titlePageStyleContent
  }
  return titleDocumentStyleContent
}

const hasTitlePage = (node) => {
  const doc = node.getDocument()
  return doc.getDoctype() === 'book' || doc.hasAttribute('title-page')
}

const footnotes = (node) => {
  if (node.hasFootnotes() && !(node.isAttribute('nofootnotes'))) {
    return `<div id="footnotes">
        <hr/>
        ${node.getFootnotes().map((footnote) => `<div class="footnote" id="_footnotedef_${footnote.getIndex()}">
        <a href="#_footnoteref_${footnote.getIndex()}">${footnote.getIndex()}</a>. ${footnote.getText()}
        </div>`).join('')}
      </div>`
  }
  return ''
}

const syntaxHighlighterHead = (node, syntaxHighlighter, attrs) => {
  if (syntaxHighlighter !== Opal.nil && syntaxHighlighter['$docinfo?']('head')) {
    return syntaxHighlighter['$docinfo']('head', node, Opal.hash(attrs))
  }
  return ''
}

const syntaxHighlighterFooter = (node, syntaxHighlighter, attrs) => {
  if (syntaxHighlighter !== Opal.nil && syntaxHighlighter['$docinfo?']('footer')) {
    return syntaxHighlighter['$docinfo']('footer', node, Opal.hash(attrs))
  }
  return ''
}

const assetUriScheme = (node) => {
  let result = node.getAttribute('asset-uri-scheme', 'https')
  if (result.trim() !== '') {
    result = `${result}:`
  }
  return result
}

const titlePage = (node) => {
  if (node.getDocumentTitle()) {
    const doc = node.getDocument()
    if (hasTitlePage(doc)) {
      return `<div id="cover" class="title-page">
  <h1>${node.getDocumentTitle()}</h1>
  <h2>${node.getDocument().getAuthor()}</h2>
</div>`
    }
    return `<div class="title-document">
  <h1>${node.getDocumentTitle()}</h1>
</div>`
  }
  return ''
}

module.exports = {
  document: (node) => {
    const cdnBaseUrl = `${assetUriScheme(node)}//cdnjs.cloudflare.com/ajax/libs`
    const linkcss = node.isAttribute('linkcss')
    const contentHTML = `<div id="content" class="content">
${node.getContent()}
</div>`
    const syntaxHighlighter = node['$syntax_highlighter']()
    return `<!DOCTYPE html>
<html dir="ltr" lang="en">
<head>
<meta charset="UTF-8">
<style>
${asciidoctorStyleContent}
${documentStyleContent}
${titlePageStyle(node)}
${customStyleContent(node)}
</style>
<script>
${pagedContent}
${repeatTableHeadersContent}
</script>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${syntaxHighlighterHead(node, syntaxHighlighter, { linkcss: linkcss })}
</head>
<body class="article">
${titlePage(node)}
${contentHTML}
${footnotes(node)}
${syntaxHighlighterFooter(node, syntaxHighlighter, { cdn_base_url: cdnBaseUrl, linkcss: linkcss, self_closing_tag_slash: '/' })}
</body>`
  }
}
