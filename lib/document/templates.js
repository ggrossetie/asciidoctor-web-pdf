/* global Opal */
const fs = require('fs')
const ospath = require('path')
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
  push(faIcon(faHandPaper, { transform: { size: 10, x: -0.5 }, classes: 'fa-inverse' }))
})
const faTipIcon = faLayer((push) => {
  push(faIcon(faCircle))
  push(faIcon(faLightbulb, { transform: { size: 10 }, classes: 'fa-inverse' }))
})

const repeatTableHeadersContent = fs.readFileSync(`${__dirname}/repeating-table-headers.js`, 'utf8')
const pagedContent = fs.readFileSync(require.resolve('pagedjs/dist/paged.polyfill.js'), 'utf8')
const pagedRendering = fs.readFileSync(`${__dirname}/paged-rendering.js`, 'utf8')
const stylesDirectoryPath = ospath.resolve(`${__dirname}/../../css`)
const asciidoctorStyleContent = fs.readFileSync(`${stylesDirectoryPath}/asciidoctor.css`, 'utf8')
const documentStyleContent = fs.readFileSync(`${stylesDirectoryPath}/document.css`, 'utf8')
const titleDocumentStyleContent = fs.readFileSync(`${stylesDirectoryPath}/features/title-document-numbering.css`, 'utf8')
const titlePageStyleContent = fs.readFileSync(`${stylesDirectoryPath}/features/title-page-numbering.css`, 'utf8')
const bookStyleContent = fs.readFileSync(`${stylesDirectoryPath}/features/book.css`, 'utf8')

const resolveStylesheet = (requirePath, cwd = process.cwd()) => {
  // NOTE appending node_modules prevents require from looking elsewhere before looking in these paths
  const paths = [cwd, ospath.dirname(__dirname)].map((start) => ospath.join(start, 'node_modules'))
  return require.resolve(requirePath, { paths })
}

const styles = (node) => {
  const stylesheetAttribute = node.getAttribute('stylesheet')
  if (stylesheetAttribute && stylesheetAttribute.trim() !== '') {
    return stylesheetAttribute
      .split(';')
      .map(value => value.trim())
      .filter(value => value !== '')
      .map(stylesheet => {
        let href
        if (ospath.isAbsolute(stylesheet)) {
          href = stylesheet
        } else {
          const stylesDirectory = node.getAttribute('stylesdir')
          let start
          if (stylesDirectory) {
            if (ospath.isAbsolute(stylesDirectory)) {
              start = stylesDirectory
            } else {
              start = ospath.join(node.getDocument().getBaseDir(), stylesDirectory)
            }
          } else {
            start = node.getDocument().getBaseDir()
          }
          href = ospath.join(start, stylesheet)
          if (!fs.existsSync(href)) {
            try {
              href = resolveStylesheet(stylesheet)
            } catch (_) {
              console.warn(`Unable to resolve the stylesheet: ${stylesheet}`)
            }
          }
        }
        return `<link href="${href}" rel="stylesheet">`
      })
      .join('\n')
  }
  return `<style>
${asciidoctorStyleContent}
${documentStyleContent}
${titlePageStyle(node)}
${documentTypeStyle(node)}
</style>`
}

const titlePageStyle = (node) => {
  if (hasTitlePage(node)) {
    // The page number start after the first page (ie. the title page)
    return titlePageStyleContent
  }
  return titleDocumentStyleContent
}

const documentTypeStyle = (node) => {
  const doc = node.getDocument()
  if (doc.getDoctype() === 'book') {
    return bookStyleContent
  }
  return ''
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

const fontAwesomeStyle = (node) => {
  if (isSvgIconEnabled(node)) {
    return `<style>
${faDom.css()}
</style>`
  }
  return ''
}

// <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.15.6/styles/github.min.css"/>
const linkStylesheet = /(<link rel="stylesheet"[^>]*\/>)/g

const syntaxHighlighterHead = (node, syntaxHighlighter, attrs) => {
  let header = ''
  if (syntaxHighlighter !== Opal.nil && syntaxHighlighter['$docinfo?']('head')) {
    header = syntaxHighlighter.$docinfo('head', node, Opal.hash(attrs))
  }
  if (syntaxHighlighter !== Opal.nil && syntaxHighlighter['$docinfo?']('footer')) {
    // reordering all link elements from footer to header, as pagedjs would otherwise render them too late in the process
    const footer = syntaxHighlighter.$docinfo('footer', node, Opal.hash(attrs))
    const matches = footer.match(linkStylesheet)
    if (matches !== null) {
      matches.forEach((element) => {
        header = header + element
      })
    }
  }
  return header
}

const syntaxHighlighterFooter = (node, syntaxHighlighter, attrs) => {
  let footer = ''
  if (syntaxHighlighter !== Opal.nil && syntaxHighlighter['$docinfo?']('footer')) {
    // skip all link elements in the footer as they are re-ordered to the header by syntaxHighlighterHead()
    footer = syntaxHighlighter.$docinfo('footer', node, Opal.hash(attrs))
    footer = footer.replace(linkStylesheet, '')
  }
  return footer
}

const assetUriScheme = (node) => {
  let result = node.getAttribute('asset-uri-scheme', 'https')
  if (result.trim() !== '') {
    result = `${result}:`
  }
  return result
}

const langAttr = (node) => {
  const attrNolang = node.getAttribute('nolang')
  if (attrNolang === '') {
    return ''
  }
  const attrLang = node.getAttribute('lang', 'en')
  return ` lang="${attrLang}"`
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
    return `<div style="display: none;">${baseConverter.$convert_outline(node)}</div>`
  }
  return ''
}

const tocHeader = (node, baseConverter) => {
  if (node.hasHeader()) {
    const tocPlacement = node.getAttribute('toc-placement', 'auto')
    // Add a toc in the header if the toc placement is auto (default), left or right
    const hasTocPlacementHeader = tocPlacement === 'auto' || tocPlacement === 'left' || tocPlacement === 'right'
    if (node.hasSections() && node.hasAttribute('toc') && hasTocPlacementHeader) {
      return `<div id="toc" class="${node.getAttribute('toc-class', 'toc')}">
<div id="toctitle">${node.getAttribute('toc-title')}</div>
${baseConverter.$convert_outline(node)}
</div>`
    }
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
    const syntaxHighlighter = node.$syntax_highlighter()
    const bodyAttrs = node.getId() ? [`id="${node.getId()}"`] : []
    let classes
    if (node.hasSections() && node.isAttribute('toc-class') && node.isAttribute('toc') && node.isAttribute('toc-placement', 'auto')) {
      classes = [node.getDoctype(), node.getAttribute('toc-class'), `toc-${node.getAttribute('toc-position', 'header')}`]
    } else {
      classes = [node.getDoctype()]
    }
    if (node.hasRole()) {
      classes.push(node.getRole())
    }
    bodyAttrs.push(`class="${classes.join(' ')}"`)
    if (node.hasAttribute('max-width')) {
      bodyAttrs.push(`style="max-width: ${node.getAttribute('max-width')};"`)
    }
    return `<!DOCTYPE html>
<html dir="ltr"${langAttr(node)}>
<head>
<title>${node.getDocumentTitle({ sanitize: true, use_fallback: true })}</title>
<meta charset="UTF-8">
${fontAwesomeStyle(node)}
${styles(node)}
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${syntaxHighlighterHead(node, syntaxHighlighter, { cdn_base_url: cdnBaseUrl, linkcss: linkcss, self_closing_tag_slash: '/' })}
</head>
<body ${bodyAttrs.join(' ')}>
${titlePage(node)}
${outline(node, baseConverter)}
${tocHeader(node, baseConverter)}
${contentHTML}
${footnotes(node)}
${syntaxHighlighterFooter(node, syntaxHighlighter, { cdn_base_url: cdnBaseUrl, linkcss: linkcss, self_closing_tag_slash: '/' })}
${stemContent.content(node)}
<script>
${pagedContent}
${pagedRendering}
${repeatTableHeadersContent}
</script>
</body>
</html>`
  },
  admonition: (node) => {
    const idAttribute = node.getId() ? ` id="${node.getId()}"` : ''
    const name = node.getAttribute('name')
    const titleElement = node.getTitle() ? `<div class="title">${node.getTitle()}</div>\n` : ''
    let label
    if (node.getDocument().hasAttribute('icons')) {
      if (node.getDocument().isAttribute('icons', 'font') && !node.hasAttribute('icon')) {
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
        label = icon.html
      } else {
        label = `<img src="${node.getIconUri(name)}" alt="${node.getAttribute('textlabel')}"/>`
      }
    } else {
      label = `<div class="title">${node.getAttribute('textlabel')}</div>`
    }
    return `<div${idAttribute} class="admonitionblock ${name}${node.getRole() ? node.getRole() : ''}">
<table>
<tr>
<td class="icon icon-${name}">
${label}
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
    return '<div class="page-break" style="break-after: page;"></div>'
  },
  preamble: (node, baseConverter) => {
    const doc = node.getDocument()
    let toc
    if (doc.isAttribute('toc-placement', 'preamble') && doc.hasSections() && doc.hasAttribute('toc')) {
      toc = `<div id="toc" class="${doc.getAttribute('toc-class', 'toc')}">
<div id="toctitle">${doc.getAttribute('toc-title')}</div>
${baseConverter.$convert_outline(doc)}
</div>`
    } else {
      toc = ''
    }
    return `<div id="preamble">
<div class="sectionbody">
${node.getContent()}
</div>${toc}
</div>`
  }
}
