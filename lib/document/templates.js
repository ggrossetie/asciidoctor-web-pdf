const fs = require('fs')
const path = require('path')
const stemContent = require('./stem')

const { layer: faLayer, icon: faIcon, dom: faDom, library: faLibrary } = require('@fortawesome/fontawesome-svg-core')
const { faCircle, faInfoCircle, faExclamationCircle, faQuestionCircle, faExclamationTriangle, faHandPaper, fas } = require('@fortawesome/free-solid-svg-icons')
const { faLightbulb, far } = require('@fortawesome/free-regular-svg-icons')
const { fab } = require('@fortawesome/free-brands-svg-icons')
faLibrary.add(fas, far, fab)

const faDefaultIcon = faIcon(faQuestionCircle)
const faImportantIcon = faIcon(faExclamationCircle)
const faNoteIcon = faIcon(faInfoCircle)
const faWarningIcon = faIcon(faExclamationTriangle)
const faCautionIcon = faLayer((push) => {
  push(faIcon(faCircle))
  push(faIcon(faHandPaper, { transform: { size: 10, x: -0.5 } }))

})
const faTipIcon = faLayer((push) => {
  push(faIcon(faCircle))
  push(faIcon(faLightbulb, { transform: { size: 10 } }))
})

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

const fontAwesomeStyleContent = (node) => {
  if (isSvgIconEnabled(node)) {
    return faDom.css()
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

const isSvgIconEnabled = (node) => node.getDocument().isAttribute('icontype', 'svg') || node.getDocument().isAttribute('icons', 'font')

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

/**
 * Generate an (hidden) outline otherwise Chrome won't generate "Dests" fields and we won't be able to generate a PDF outline.
 */
const outline = (node, baseConverter) => {
  if (baseConverter) {
    return `<div style="display: none;">${baseConverter['$convert_outline'](node)}</div>`
  }
  return ''
}

module.exports = {
  document: (node, baseConverter) => {
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
${fontAwesomeStyleContent(node)}
${titlePageStyle(node)}
${customStyleContent(node)}
</style>
${stemContent.content(node)}
<script>
${pagedContent}
${repeatTableHeadersContent}
</script>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${syntaxHighlighterHead(node, syntaxHighlighter, { linkcss: linkcss })}
</head>
<body class="article">
${titlePage(node)}
${outline(node, baseConverter)}
${contentHTML}
${footnotes(node)}
${syntaxHighlighterFooter(node, syntaxHighlighter, { cdn_base_url: cdnBaseUrl, linkcss: linkcss, self_closing_tag_slash: '/' })}
</body>`
  },
  admonition: (node) => {
    const idAttribute = node.getId() ? ` id="${node.getId()}"` : ''
    const name = node.getAttribute('name')
    const titleElement = node.getTitle() ? `<div class="title">${node.getTitle()}</div>\n` : ''
    let icon
    if (name === 'note') {
      icon = faNoteIcon
    } else if (name === 'important') {
      icon = faImportantIcon
    } else if (name === 'caution') {
      icon = faCautionIcon
    } else if (name === 'tip') {
      icon = faTipIcon
    } else if (name === 'warning') {
      icon = faWarningIcon
    } else {
      icon = faDefaultIcon
    }
    return `<div${idAttribute} class="admonitionblock ${name}${node.getRole() ? node.getRole() : ''}">
<table>
<tr>
<td class="icon icon-${name}">
${icon.html}
</td>
<td class="content">
${titleElement}${node.getContent()}
</td>
</tr>
</table>
</div>`
  },
  inline_callout: (node) => {
    return `<i class="conum" data-value="${node.text}"></i>`
  },
  inline_image: (node, baseConverter) => {
    if (node.getType() === 'icon' && isSvgIconEnabled(node)) {
      const transform = {}
      if (node.hasAttribute('rotate')) {
        transform.rotate = node.getAttribute('rotate')
      }
      if (node.hasAttribute('flip')) {
        const flip = node.getAttribute('flip')
        if (flip === 'vertical' || flip === 'y' || flip === 'v') {
          transform.flipY = true
        } else {
          transform.flipX = true
        }
      }
      const options = {}
      options.transform = transform
      if (node.hasAttribute('title')) {
        options.title = node.getAttribute('title')
      }
      options.classes = []
      if (node.hasAttribute('size')) {
        options.classes.push(`fa-${node.getAttribute('size')}`)
      }
      if (node.getRoles() && node.getRoles().length > 0) {
        options.classes = options.classes.concat(node.getRoles().map(value => value.trim()))
      }
      const meta = {}
      const target = node.getTarget()
      let iconName = target
      if (node.hasAttribute('set')) {
        meta.prefix = node.getAttribute('set')
      } else if (target.includes('@')) {
        const parts = target.split('@')
        iconName = parts[0]
        meta.prefix = parts[1]
      }
      meta.iconName = iconName
      const icon = faIcon(meta, options)
      if (icon) {
        return icon.html
      }
    } else {
      return baseConverter.$convert_inline_image(node)
    }
  },
  colist: (node) => {
    const result = []
    const idAttribute = node.getId() ? ` id="${node.getId()}"` : ''
    let classes = ['colist']
    if (node.getStyle()) {
      classes = classes.concat(node.getStyle())
    }
    if (node.getRole()) {
      classes = classes.concat(node.getRole())
    }
    const classAttribute = ` class="${classes.join(' ')}"`
    result.push(`<div${idAttribute}${classAttribute}>`)
    if (node.getTitle()) {
      result.push(`<div class="title">${node.getTitle()}</div>`)
    }
    if (node.getDocument().hasAttribute('icons') || node.getDocument().isAttribute('icontype', 'svg')) {
      result.push('<table>')
      let num = 0
      const svgIcons = isSvgIconEnabled(node)
      let numLabel
      node.getItems().forEach((item) => {
        num += 1
        if (svgIcons) {
          numLabel = `<i class="conum" data-value="${num}"></i><b>${num}</b>`
        } else {
          numLabel = `<i class="conum" data-value="${num}"></i><b>${num}</b>`
        }
        result.push(`<tr>
          <td>${numLabel}</td>
          <td>${item.getText()}${item['$blocks?']() ? `\n ${item.getContent()}` : ''}</td>
          </tr>`)
      })
      result.push('</table>')
    } else {
      result.push('<ol>')

      node.getItems().forEach((item) => {
        result.push(`<li>
<p>${item.getText()}</p>${item['$blocks?']() ? `\n ${item.getContent()}` : ''}`)
      })
      result.push('</ol>')
    }
    result.push('</div>')
    return result.join('\n')
  },
  page_break: () => {
    // Paged.js does not support inline style: https://gitlab.pagedmedia.org/tools/pagedjs/issues/146
    return '<div class="page-break" style="break-after: always;"></div>'
  }
}
