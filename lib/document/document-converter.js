/* global Opal */
const fs = require('fs')
const ospath = require('path')

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

const DropAnchorRx = /<(?:a[^>+]+|\/a)>/

class DocumentPDFConverter {
  /* eslint-disable camelcase */
  constructor () {
    this.baseConverter = Opal.Asciidoctor.Html5Converter.create()
    // <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.15.6/styles/github.min.css"/>
    this.linkStylesheet = /(<link rel="stylesheet"[^>]*\/>)/g
    this.stemContent = require('./stem')
    this.repeatTableElementsContent = fs.readFileSync(ospath.join(__dirname, 'repeating-table-elements.js'), 'utf8')
    this.pagedContent = fs.readFileSync(ospath.join(__dirname, 'paged.polyfill.js'), 'utf8')
    this.pagedRendering = fs.readFileSync(`${__dirname}/paged-rendering.js`, 'utf8')
    const stylesDirectoryPath = ospath.resolve(`${__dirname}/../../css`)
    this.asciidoctorStyleContent = fs.readFileSync(`${stylesDirectoryPath}/asciidoctor.css`, 'utf8')
    this.documentStyleContent = fs.readFileSync(`${stylesDirectoryPath}/document.css`, 'utf8')
    this.titleDocumentStyleContent = fs.readFileSync(`${stylesDirectoryPath}/features/title-document-numbering.css`, 'utf8')
    this.titlePageStyleContent = fs.readFileSync(`${stylesDirectoryPath}/features/title-page.css`, 'utf8')
    this.bookStyleContent = fs.readFileSync(`${stylesDirectoryPath}/features/book.css`, 'utf8')
  }

  convert (node, transform, opts) {
    const name = `convert_${transform || node.node_name}`
    const convertFunction = this[name]
    if (convertFunction) {
      return convertFunction.call(this, node)
    }
    return this.baseConverter.convert(node, transform, opts)
  }

  convert_document (node, opts = {}) {
    const cdnBaseUrl = `${this.assetUriScheme(node)}//cdnjs.cloudflare.com/ajax/libs`
    const linkcss = node.isAttribute('linkcss')
    let contentHTML = ''
    const content = node.getContent()
    if (content && content.trim() !== '') {
      contentHTML = `<div id="content" class="content">
${content}
</div>`
    }
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
<html dir="ltr"${this.langAttr(node)}>
<head>
<title>${node.getDocumentTitle({ sanitize: true, use_fallback: true })}</title>
<meta charset="UTF-8">
${this.fontAwesomeStyle(node)}
${this.styles(node)}
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${this.syntaxHighlighterHead(node, syntaxHighlighter, { cdn_base_url: cdnBaseUrl, linkcss: linkcss, self_closing_tag_slash: '/' })}
${this.docinfoContent(node, 'head', '-pdf.html')}
</head>
<body ${bodyAttrs.join(' ')}>
${this.docinfoContent(node, 'header', '-pdf.html')}
${this.docinfoContent(node, 'running', '-pdf.html')}
${this.titlePage(node)}
${this.outline(node, opts)}
${this.tocHeader(node, opts)}
${contentHTML}
${this.footnotes(node)}
${this.syntaxHighlighterFooter(node, syntaxHighlighter, { cdn_base_url: cdnBaseUrl, linkcss: linkcss, self_closing_tag_slash: '/' })}
${this.stemContent.content(node)}
<script>
${this.pagedContent}
${this.pagedRendering}
${this.repeatTableElementsContent}
</script>
${this.docinfoContent(node, 'footer', '-pdf.html')}
</body>
</html>`
  }

  convert_outline (node, opts = {}) {
    if (!node.hasSections()) {
      return
    }
    const sectnumlevels = opts.sectnumlevels || (parseInt(node.getDocument().getAttributes().sectnumlevels) || 3)
    const toclevels = opts.toclevels || (parseInt(node.getDocument().getAttributes().toclevels) || 2)
    const sections = node.getSections()
    // FIXME top level is incorrect if a multipart book starts with a special section defined at level 0
    const result = []
    result.push(`<ul class="sectlevel${sections[0].getLevel()}">`)
    let stitle
    for (const section of sections) {
      const slevel = section.getLevel()
      if (section.getCaption()) {
        stitle = section.getCaptionedTitle()
      } else if (section.isNumbered() && slevel <= sectnumlevels) {
        if (slevel < 2 && node.getDocument().getDoctype() === 'book') {
          if (section.getSectionName() === 'chapter') {
            const signifier = node.getDocument().getAttributes()['chapter-signifier']
            stitle = `${signifier ? `"${signifier} "` : ''}${section['$sectnum']()} ${section.getTitle()}`
          } else if (section.getSectionName() === 'part') {
            const signifier = node.getDocument().getAttributes()['part-signifier']
            stitle = `${signifier ? `"${signifier} "` : ''}${section['$sectnum'](Opal.nil, ':')} ${section.getTitle()}`
          } else {
            stitle = `${section['$sectnum']()} ${section.getTitle()}`
          }
        } else {
          stitle = `${section['$sectnum']()} ${section.getTitle()}`
        }
      } else {
        stitle = section.getTitle()
      }
      if (stitle.includes('<a')) {
        stitle = stitle.replace(DropAnchorRx, '')
      }
      const childTocLevel = this.convert_outline(section, {
        toclevels,
        sectnumlevels
      })
      if (slevel < toclevels && childTocLevel) {
        result.push(`<li class="toc-entry"><a href="#${section.getId()}">${stitle}</a>`)
        result.push(`<li>${childTocLevel}</li>`)
        result.push('</li>')
      } else {
        result.push(`<li class="toc-entry"><a href="#${section.getId()}">${stitle}</a></li>`)
      }
    }
    result.push('</ul>')
    return result.join('\n')
  }

  convert_admonition (node) {
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
  }

  convert_inline_callout (node) {
    return `<i class="conum" data-value="${node.text}"></i>`
  }

  convert_inline_image (node) {
    if (node.getType() === 'icon' && this.isSvgIconEnabled(node)) {
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
      return this.baseConverter.$convert_inline_image(node)
    }
  }

  convert_colist (node) {
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
      const svgIcons = this.isSvgIconEnabled(node)
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
  }

  convert_page_break () {
    // Paged.js does not support inline style: https://gitlab.pagedmedia.org/tools/pagedjs/issues/146
    return '<div class="page-break" style="break-after: page;"></div>'
  }

  convert_preamble (node, opts = {}) {
    const doc = node.getDocument()
    let toc
    if (!this.hasTitlePage(doc) && doc.isAttribute('toc-placement', 'preamble') && doc.hasSections() && doc.hasAttribute('toc')) {
      toc = `<div id="toc" class="${doc.getAttribute('toc-class', 'toc')}">
<div id="toctitle">${doc.getAttribute('toc-title')}</div>
${this.convert_outline(doc, opts)}
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

  convert_inline_footnote (node) {
    if (node.getDocument().isAttribute('nofootnotes')) {
      return this.baseConverter.$convert_inline_footnote(node)
    }
    const index = node.getAttribute('index')
    const text = node.getText()
    if (index) {
      return `<span id="_footnote_${index}" class="footnote">${text}</span>`
    }
    const idAttribute = node.getId() ? ` id="_footnote_${node.getId()}"` : ''
    return `<span${idAttribute} class="footnote">${text}</span>`
  }

  resolveStylesheet (requirePath, cwd = process.cwd()) {
    // NOTE appending node_modules prevents require from looking elsewhere before looking in these paths
    const paths = [cwd, ospath.dirname(__dirname)].map((start) => ospath.join(start, 'node_modules'))
    return require.resolve(requirePath, { paths })
  }

  styles (node) {
    const stylesheetAttribute = node.getAttribute('stylesheet')
    // stylesheet attribute was unset using `stylesheet!` (default value is '')
    if (typeof stylesheetAttribute === 'undefined') {
      return ''
    }
    const defaultStyles = `<style>
${this.asciidoctorStyleContent}
${this.documentStyleContent}
${this.titlePageStyle(node)}
${this.documentTypeStyle(node)}
</style>`
    if (stylesheetAttribute && stylesheetAttribute.trim() !== '') {
      let separator = ','
      // REMIND for backward compatibility, will be removed in a future version
      if (stylesheetAttribute.includes(';')) {
        console.warn('Using semi-colon \';\' as a separator is deprecated and will be removed in a future version. Please use comma \',\' as a separator instead.')
        separator = ';'
      }
      const customStyles = stylesheetAttribute
        .split(separator)
        .map(value => value.trim().replace(/^\+/, ""))
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
                href = this.resolveStylesheet(stylesheet)
              } catch (_) {
                console.warn(`Unable to resolve the stylesheet: ${stylesheet}`)
              }
            }
          }
          return `<link href="${href}" rel="stylesheet">`
        })
        .join('\n')
      if (stylesheetAttribute.startsWith('+')) {
        return defaultStyles + customStyles
      }
      return customStyles
    }
    return defaultStyles
  }

  titlePageStyle (node) {
    if (this.hasTitlePage(node)) {
      // The page number start after the first page (ie. the title page)
      return this.titlePageStyleContent
    }
    return this.titleDocumentStyleContent
  }

  documentTypeStyle (node) {
    const doc = node.getDocument()
    if (doc.getDoctype() === 'book') {
      return this.bookStyleContent
    }
    return ''
  }

  hasTitlePage (node) {
    const doc = node.getDocument()
    return doc.getDoctype() === 'book' || doc.hasAttribute('title-page')
  }

  footnotes (_) {
    return ''
  }

  fontAwesomeStyle (node) {
    if (this.isSvgIconEnabled(node)) {
      return `<style>
${faDom.css()}
</style>`
    }
    return ''
  }

  docinfoContent (node, docinfoLocation, suffix) {
    const docinfoContent = node.getDocinfo(docinfoLocation, suffix)
    if (docinfoContent) {
      return docinfoContent
    }
    return ''
  }

  syntaxHighlighterHead (node, syntaxHighlighter, attrs) {
    let header = ''
    if (syntaxHighlighter !== Opal.nil && syntaxHighlighter['$docinfo?']('head')) {
      header = syntaxHighlighter.$docinfo('head', node, Opal.hash(attrs))
    }
    if (syntaxHighlighter !== Opal.nil && syntaxHighlighter['$docinfo?']('footer')) {
      // reordering all link elements from footer to header, as pagedjs would otherwise render them too late in the process
      const footer = syntaxHighlighter.$docinfo('footer', node, Opal.hash(attrs))
      const matches = footer.match(this.linkStylesheet)
      if (matches !== null) {
        matches.forEach((element) => {
          header = header + element
        })
      }
    }
    return header
  }

  syntaxHighlighterFooter (node, syntaxHighlighter, attrs) {
    let footer = ''
    if (syntaxHighlighter !== Opal.nil && syntaxHighlighter['$docinfo?']('footer')) {
      // skip all link elements in the footer as they are re-ordered to the header by syntaxHighlighterHead()
      footer = syntaxHighlighter.$docinfo('footer', node, Opal.hash(attrs))
      footer = footer.replace(this.linkStylesheet, '')
    }
    return footer
  }

  assetUriScheme (node) {
    let result = node.getAttribute('asset-uri-scheme', 'https')
    if (result.trim() !== '') {
      result = `${result}:`
    }
    return result
  }

  langAttr (node) {
    const attrNolang = node.getAttribute('nolang')
    if (attrNolang === '') {
      return ''
    }
    const attrLang = node.getAttribute('lang', 'en')
    return ` lang="${attrLang}"`
  }

  isSvgIconEnabled (node) {
    return node.getDocument().isAttribute('icontype', 'svg') || node.getDocument().isAttribute('icons', 'font')
  }

  titlePage (node) {
    if (node.getDocumentTitle()) {
      const doc = node.getDocument()
      if (this.hasTitlePage(doc)) {
        return `<div id="cover" class="title-page front-matter">
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
  outline (node, opts) {
    return `<div style="display: none;">${this.convert_outline(node, opts)}</div>`
  }

  tocHeader (node, opts) {
    if (node.hasHeader()) {
      const tocPlacement = node.getAttribute('toc-placement', 'auto')
      // Add a toc in the header if the toc placement is auto (default), left or right
      const hasTocPlacementHeader = tocPlacement === 'auto' || tocPlacement === 'left' || tocPlacement === 'right'
      if (node.hasSections() && node.hasAttribute('toc') && (hasTocPlacementHeader || this.hasTitlePage(node))) {
        return `<div id="toc" class="${node.getAttribute('toc-class', 'toc')}">
<div id="toctitle">${node.getAttribute('toc-title')}</div>
${this.convert_outline(node, opts)}
</div>`
      }
    }
    return ''
  }
}

const instance = new DocumentPDFConverter()

module.exports = DocumentPDFConverter
module.exports.templates = {
  document: (node, opts) => instance.convert_document(node, opts),
  convert_outline: (node, opts) => instance.convert_outline(node, opts),
  admonition: node => instance.convert_admonition(node),
  inline_callout: node => instance.convert_inline_callout(node),
  inline_image: node => instance.convert_inline_image(node),
  inline_footnote: node => instance.convert_inline_footnote(node),
  colist: node => instance.convert_colist(node),
  page_break: node => instance.convert_page_break(node),
  preamble: node => instance.convert_preamble(node)
}
