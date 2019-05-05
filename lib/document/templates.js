const fs = require('fs')

const repeatTableHeadersContent = fs.readFileSync(`${__dirname}/repeating-table-headers.js`, 'utf8')
const pagedContent = fs.readFileSync(require.resolve('pagedjs/dist/paged.polyfill.js'), 'utf8')
const asciidoctorStyleContent = fs.readFileSync(`${__dirname}/asciidoctor.css`, 'utf8')
const documentStyleContent = fs.readFileSync(`${__dirname}/document.css`, 'utf8')

const cover = (node) => {
  const title = node.getDocumentTitle({ partition: true })
  const subtitle = title.getSubtitle() ? `<h2>${title.getSubtitle()}</h2>` : ''
  return `<div id="cover">
  <h1>${title.getMain()}</h1>
  ${subtitle}
  <h3>${node.getDocument().getAuthor()}</h3>
</div>`
}

const iconsFont = (node, cdnBaseUrl) => {
  if (node.isAttribute('icons', 'font')) {
    return `<link rel="stylesheet" href="${node.getAttribute('iconfont-cdn', `${cdnBaseUrl}/font-awesome/4.7.0/css/font-awesome.min.css`)}"/>`
  }
  return ''
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

module.exports = {
  document: (node) => {
    const cdnBaseUrl = `${assetUriScheme(node)}//cdnjs.cloudflare.com/ajax/libs`
    const linkcss = node.isAttribute('linkcss')
    const contentHTML = `<div id="content">
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
</style>
<script>
${pagedContent}
${repeatTableHeadersContent}
</script>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${syntaxHighlighterHead(node, syntaxHighlighter, { linkcss: linkcss })}
${iconsFont(node, cdnBaseUrl)}
</head>
<body class="article">
${cover(node)}
${contentHTML}
${footnotes(node)}
${syntaxHighlighterFooter(node, syntaxHighlighter, { cdn_base_url: cdnBaseUrl, linkcss: linkcss, self_closing_tag_slash: '/' })}
</body>`
  }
}
