import fs from 'node:fs'
import { createRequire } from 'node:module'
import ospath from 'node:path'
import { Html5Converter } from '@asciidoctor/core'
import {
  dom as faDom,
  icon as faIcon,
  layer as faLayer,
  library as faLibrary,
} from '@fortawesome/fontawesome-svg-core'
import { fab } from '@fortawesome/free-brands-svg-icons'
import { faLightbulb, far } from '@fortawesome/free-regular-svg-icons'
import {
  faCircle,
  faExclamationCircle,
  faExclamationTriangle,
  faHandPaper,
  faInfoCircle,
  faQuestionCircle,
  fas,
} from '@fortawesome/free-solid-svg-icons'
import pkg from '../../package.json' with { type: 'json' }
import { processStem } from './stem.js'
import './syntax-highlighter.js'

const require = createRequire(import.meta.url)

const isSea = (() => {
  try {
    return require('node:sea').isSea()
  } catch {
    return false
  }
})()
faLibrary.add(fas, far, fab)

const faDefaultIcon = faIcon(faQuestionCircle)
const faImportantIcon = faIcon(faExclamationCircle)
const faNoteIcon = faIcon(faInfoCircle)
const faWarningIcon = faIcon(faExclamationTriangle)
const faCautionIcon = faLayer((push) => {
  push(faIcon(faCircle))
  push(
    faIcon(faHandPaper, {
      transform: { size: 10, x: -0.5 },
      classes: 'fa-inverse',
    }),
  )
})
const faTipIcon = faLayer((push) => {
  push(faIcon(faCircle))
  push(faIcon(faLightbulb, { transform: { size: 10 }, classes: 'fa-inverse' }))
})

const DropAnchorRx = /<(?:a[^>+]+|\/a)>/

// Named page sizes supported by the pdf-page-size attribute, in points.
// Same table as Asciidoctor PDF (PDF::Core::PageGeometry::SIZES).
const PageSizes = {
  '4A0': [4767.87, 6740.79],
  '2A0': [3370.39, 4767.87],
  A0: [2383.94, 3370.39],
  A1: [1683.78, 2383.94],
  A2: [1190.55, 1683.78],
  A3: [841.89, 1190.55],
  A4: [595.28, 841.89],
  A5: [419.53, 595.28],
  A6: [297.64, 419.53],
  A7: [209.76, 297.64],
  A8: [147.4, 209.76],
  A9: [104.88, 147.4],
  A10: [73.7, 104.88],
  B0: [2834.65, 4008.19],
  B1: [2004.09, 2834.65],
  B2: [1417.32, 2004.09],
  B3: [1000.63, 1417.32],
  B4: [708.66, 1000.63],
  B5: [498.9, 708.66],
  B6: [354.33, 498.9],
  B7: [249.45, 354.33],
  B8: [175.75, 249.45],
  B9: [124.72, 175.75],
  B10: [87.87, 124.72],
  C0: [2599.37, 3676.54],
  C1: [1836.85, 2599.37],
  C2: [1298.27, 1836.85],
  C3: [918.43, 1298.27],
  C4: [649.13, 918.43],
  C5: [459.21, 649.13],
  C6: [323.15, 459.21],
  C7: [229.61, 323.15],
  C8: [161.57, 229.61],
  C9: [113.39, 161.57],
  C10: [79.37, 113.39],
  RA0: [2437.8, 3458.27],
  RA1: [1729.13, 2437.8],
  RA2: [1218.9, 1729.13],
  RA3: [864.57, 1218.9],
  RA4: [609.45, 864.57],
  SRA0: [2551.18, 3628.35],
  SRA1: [1814.17, 2551.18],
  SRA2: [1275.59, 1814.17],
  SRA3: [907.09, 1275.59],
  SRA4: [637.8, 907.09],
  EXECUTIVE: [521.86, 756.0],
  FOLIO: [612.0, 936.0],
  LEGAL: [612.0, 1008.0],
  LETTER: [612.0, 792.0],
  TABLOID: [792.0, 1224.0],
}

const MeasurementRxt = '\\d+(?:\\.\\d+)?(?:in|cm|mm|p[txc])?'
// e.g., [8.5in, 11in] or 8.5in x 11in
const PageSizeRx = new RegExp(
  `^(?:\\[(${MeasurementRxt}), ?(${MeasurementRxt})\\]|(${MeasurementRxt})(?: x |x)(${MeasurementRxt}))$`,
)
const MeasurementPartsRx = /^(\d+(?:\.\d+)?)(in|mm|cm|p[txc])?$/
// Unitless measurements are points.
const PointsPerUnit = {
  pt: 1,
  in: 72,
  mm: 72 / 25.4,
  cm: 720 / 25.4,
  px: 0.75,
  pc: 12,
}

function toPt(measurement) {
  const [, num, unit] = MeasurementPartsRx.exec(measurement)
  return Number.parseFloat(num) * PointsPerUnit[unit || 'pt']
}

// Resolves the pdf-page-size and pdf-page-layout attributes the same way
// Asciidoctor PDF does, as [width, height] in points; undefined when neither
// is set (or valid), so the page size defined in the stylesheets applies.
function pageSize(node) {
  const doc = node.getDocument()
  let size
  const sizeAttr = (doc.getAttribute('pdf-page-size') || '').trim()
  const match = PageSizeRx.exec(sizeAttr)
  if (match) {
    size = [match[1] || match[3], match[2] || match[4]].map(toPt)
    if (size.some((dim) => !(dim > 0))) {
      size = undefined
    }
  } else if (sizeAttr) {
    size = PageSizes[sizeAttr.toUpperCase()]
  }
  const landscape = doc.getAttribute('pdf-page-layout') === 'landscape'
  if (!size && !landscape) {
    return undefined
  }
  // like Prawn, landscape swaps the dimensions of the (default A4) page size
  const [width, height] = size || PageSizes.A4
  return landscape ? [height, width] : [width, height]
}

class DocumentPDFConverter {
  /* eslint-disable camelcase */
  constructor() {
    this.baseConverter = new Html5Converter('html5')
    // <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.15.6/styles/github.min.css"/>
    this.linkStylesheet = /(<link rel="stylesheet"[^>]*\/>)/g
    const stylesDir = isSea
      ? ospath.join(ospath.dirname(process.execPath), 'css')
      : ospath.resolve(`${import.meta.dirname}/../../css`)
    this.asciidoctorStyleContent = fs.readFileSync(
      `${stylesDir}/asciidoctor.css`,
      'utf8',
    )
    this.documentStyleContent = fs.readFileSync(
      `${stylesDir}/document.css`,
      'utf8',
    )
    this.titleDocumentStyleContent = fs.readFileSync(
      `${stylesDir}/features/title-document-numbering.css`,
      'utf8',
    )
    this.titlePageStyleContent = fs.readFileSync(
      `${stylesDir}/features/title-page.css`,
      'utf8',
    )
    this.bookStyleContent = fs.readFileSync(
      `${stylesDir}/features/book.css`,
      'utf8',
    )
  }

  convert(node, transform, opts) {
    const name = `convert_${transform || node.nodeName}`
    const convertFunction = this[name]
    if (convertFunction) {
      return convertFunction.call(this, node)
    }
    return this.baseConverter.convert(node, transform, opts)
  }

  async convert_document(node, opts = {}) {
    const cdnBaseUrl = `${this.assetUriScheme(node)}//cdnjs.cloudflare.com/ajax/libs`
    const linkcss = node.isAttribute('linkcss')
    let contentHTML = ''
    const content = await node.getContent()
    if (content && content.trim() !== '') {
      contentHTML = `<div id="content" class="content">
${content}
</div>`
    }
    const syntaxHighlighter = node.syntaxHighlighter
    const bodyAttrs = node.getId() ? [`id="${node.getId()}"`] : []
    let classes
    if (
      node.hasSections() &&
      node.isAttribute('toc-class') &&
      node.isAttribute('toc') &&
      node.isAttribute('toc-placement', 'auto')
    ) {
      classes = [
        node.getDoctype(),
        node.getAttribute('toc-class'),
        `toc-${node.getAttribute('toc-position', 'header')}`,
      ]
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
    const [docinfoHead, docinfoHeader, docinfoRunning, docinfoFooter] =
      await Promise.all([
        this.docinfoContent(node, 'head', '-pdf.html'),
        this.docinfoContent(node, 'header', '-pdf.html'),
        this.docinfoContent(node, 'running', '-pdf.html'),
        this.docinfoContent(node, 'footer', '-pdf.html'),
      ])
    const result = `<!DOCTYPE html>
<html dir="ltr"${this.langAttr(node)}>
<head>
<title>${node.getDocumentTitle({ sanitize: true, use_fallback: true })}</title>
<meta charset="UTF-8">
<meta name="generator" content="Asciidoctor Web PDF ${pkg.version}">
${this.fontAwesomeStyle(node)}
${this.styles(node)}
${this.pageSizeStyle(node)}
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${this.syntaxHighlighterHead(node, syntaxHighlighter, { cdn_base_url: cdnBaseUrl, linkcss: linkcss, self_closing_tag_slash: '/' })}
${docinfoHead}
</head>
<body ${bodyAttrs.join(' ')}>
${docinfoHeader}
${docinfoRunning}
${this.titlePage(node)}
${this.outline(node, opts)}
${this.tocHeader(node, opts)}
${contentHTML}
${this.footnotes(node)}
${this.syntaxHighlighterFooter(node, syntaxHighlighter, { cdn_base_url: cdnBaseUrl, linkcss: linkcss, self_closing_tag_slash: '/' })}
${docinfoFooter}
</body>
</html>`
    return processStem(result, node)
  }

  convert_outline(node, opts = {}) {
    if (!node.hasSections()) {
      return
    }
    const sectnumlevels =
      opts.sectnumlevels ||
      parseInt(node.getDocument().attributes.sectnumlevels, 10) ||
      3
    const toclevels =
      opts.toclevels ||
      parseInt(node.getDocument().attributes.toclevels, 10) ||
      2
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
            const signifier = node.getDocument().attributes['chapter-signifier']
            stitle = `${signifier ? `"${signifier} "` : ''}${section.sectnum()} ${section.getTitle()}`
          } else if (section.getSectionName() === 'part') {
            const signifier = node.getDocument().attributes['part-signifier']
            stitle = `${signifier ? `"${signifier} "` : ''}${section.sectnum('.', ':')} ${section.getTitle()}`
          } else {
            stitle = `${section.sectnum()} ${section.getTitle()}`
          }
        } else {
          stitle = `${section.sectnum()} ${section.getTitle()}`
        }
      } else {
        stitle = section.getTitle()
      }
      if (stitle.includes('<a')) {
        stitle = stitle.replace(DropAnchorRx, '')
      }
      const childTocLevel = this.convert_outline(section, {
        toclevels,
        sectnumlevels,
      })
      if (slevel < toclevels && childTocLevel) {
        result.push(
          `<li class="toc-entry"><a href="#${section.getId()}">${stitle}</a>`,
        )
        result.push(`<li>${childTocLevel}</li>`)
        result.push('</li>')
      } else {
        result.push(
          `<li class="toc-entry"><a href="#${section.getId()}">${stitle}</a></li>`,
        )
      }
    }
    result.push('</ul>')
    return result.join('\n')
  }

  async convert_admonition(node) {
    const idAttribute = node.getId() ? ` id="${node.getId()}"` : ''
    const name = node.getAttribute('name')
    const titleElement = node.getTitle()
      ? `<div class="title">${node.getTitle()}</div>\n`
      : ''
    let label
    if (node.getDocument().hasAttribute('icons')) {
      if (
        node.getDocument().isAttribute('icons', 'font') &&
        !node.hasAttribute('icon')
      ) {
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
    const content = await node.getContent()
    return `<div${idAttribute} class="admonitionblock ${name}${node.getRole() ? node.getRole() : ''}">
<table>
<tr>
<td class="icon icon-${name}">
${label}
</td>
<td class="content">
${titleElement}${content}
</td>
</tr>
</table>
</div>`
  }

  async convert_example(node) {
    if (!node.hasOption('collapsible')) {
      return this.baseConverter.convert(node, 'example')
    }
    // A PDF has no interactivity, so a collapsed block would just be
    // invisible content; always render it expanded.
    const idAttribute = node.getId() ? ` id="${node.getId()}"` : ''
    const classAttribute = node.getRole() ? ` class="${node.getRole()}"` : ''
    const summaryElement = node.getTitle()
      ? `<summary class="title">${node.getTitle()}</summary>`
      : '<summary class="title">Details</summary>'
    const content = await node.getContent()
    return `<details${idAttribute}${classAttribute} open>
${summaryElement}
<div class="content">
${content}
</div>
</details>`
  }

  convert_inline_callout(node) {
    return `<i class="conum" data-value="${node.text}"></i>`
  }

  convert_inline_image(node) {
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
        options.classes = options.classes.concat(
          node.getRoles().map((value) => value.trim()),
        )
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
      return this.baseConverter.convert(node, 'inline_image')
    }
  }

  async convert_colist(node) {
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
    if (
      node.getDocument().hasAttribute('icons') ||
      node.getDocument().isAttribute('icontype', 'svg')
    ) {
      result.push('<table>')
      let num = 0
      const _svgIcons = this.isSvgIconEnabled(node)
      for (const item of node.getItems()) {
        num += 1
        const numLabel = `<i class="conum" data-value="${num}"></i><b>${num}</b>`
        const itemContent = item.hasBlocks()
          ? `\n ${await item.getContent()}`
          : ''
        result.push(`<tr>
          <td>${numLabel}</td>
          <td>${item.getText()}${itemContent}</td>
          </tr>`)
      }
      result.push('</table>')
    } else {
      result.push('<ol>')
      for (const item of node.getItems()) {
        const itemContent = item.hasBlocks()
          ? `\n ${await item.getContent()}`
          : ''
        result.push(`<li>
<p>${item.getText()}</p>${itemContent}`)
      }
      result.push('</ol>')
    }
    result.push('</div>')
    return result.join('\n')
  }

  convert_page_break() {
    return '<div class="page-break" style="break-after: page;"></div>'
  }

  async convert_preamble(node, opts = {}) {
    const doc = node.getDocument()
    let toc
    if (
      doc.isAttribute('toc-placement', 'preamble') &&
      doc.hasSections() &&
      doc.hasAttribute('toc')
    ) {
      toc = `<div id="toc" class="${doc.getAttribute('toc-class', 'toc')}">
<div id="toctitle">${doc.getAttribute('toc-title')}</div>
${this.convert_outline(doc, opts)}
</div>`
    } else {
      toc = ''
    }
    const content = await node.getContent()
    return `<div id="preamble">
<div class="sectionbody">
${content}
</div>${toc}
</div>`
  }

  async convert_inline_footnote(node) {
    if (node.getDocument().isAttribute('nofootnotes')) {
      return this.baseConverter.convert(node, 'inline_footnote')
    }
    const index = node.getAttribute('index')
    if (index && node.getType() === 'xref') {
      // A repeat reference to an already-defined footnote: link back to the
      // existing floated definition instead of floating a second copy of it
      // (which would render as a duplicate entry with a new number). The
      // call number itself comes from the CSS `counter(footnote)` (see
      // [data-footnote-call] in document.css), not a hardcoded value, since
      // Asciidoctor's own `index` attribute doesn't match the running
      // footnote count that `float: footnote` numbers by.
      return `<sup class="footnoteref"><a class="footnote" data-footnote-call href="#_footnote_${index}" title="View footnote."></a></sup>`
    }
    const text = node.getText()
    if (index) {
      return `<span id="_footnote_${index}" class="footnote">${text}</span>`
    }
    const idAttribute = node.getId() ? ` id="_footnote_${node.getId()}"` : ''
    return `<span${idAttribute} class="footnote">${text}</span>`
  }

  resolveStylesheet(requirePath, cwd = process.cwd()) {
    // NOTE appending node_modules prevents require from looking elsewhere before looking in these paths
    const paths = [cwd, ospath.dirname(import.meta.dirname)].map((start) =>
      ospath.join(start, 'node_modules'),
    )
    try {
      return require.resolve(requirePath, { paths })
    } catch (e) {
      if (e.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED') {
        // Package has strict exports — resolve by walking node_modules directly
        const parts = requirePath.split('/')
        const packageName = requirePath.startsWith('@')
          ? `${parts[0]}/${parts[1]}`
          : parts[0]
        const subPath = requirePath.slice(packageName.length + 1)
        for (const nodeModulesDir of paths) {
          const candidate = ospath.join(nodeModulesDir, packageName, subPath)
          if (fs.existsSync(candidate)) {
            return candidate
          }
        }
      }
      throw e
    }
  }

  styles(node) {
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
        console.warn(
          "Using semi-colon ';' as a separator is deprecated and will be removed in a future version. Please use comma ',' as a separator instead.",
        )
        separator = ';'
      }
      const customStyles = stylesheetAttribute
        .split(separator)
        .map((value) => value.trim().replace(/^\+/, ''))
        .filter((value) => value !== '')
        .map((stylesheet) => {
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
                start = ospath.join(
                  node.getDocument().getBaseDir(),
                  stylesDirectory,
                )
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

  // Translates the pdf-page-size and pdf-page-layout attributes into an
  // @page size rule. The page size must be set in CSS (not as a Puppeteer
  // page.pdf() option) since Vivliostyle lays out pages from @page and the
  // PDF is printed with preferCSSPageSize.
  pageSizeStyle(node) {
    const size = pageSize(node)
    if (!size) {
      return ''
    }
    const [width, height] = size
    return `<style>
@page { size: ${width}pt ${height}pt; }
</style>`
  }

  titlePageStyle(node) {
    if (this.hasTitlePage(node)) {
      // The page number start after the first page (ie. the title page)
      return this.titlePageStyleContent
    }
    return this.titleDocumentStyleContent
  }

  documentTypeStyle(node) {
    const doc = node.getDocument()
    if (doc.getDoctype() === 'book') {
      return this.bookStyleContent
    }
    return ''
  }

  hasTitlePage(node) {
    const doc = node.getDocument()
    return doc.getDoctype() === 'book' || doc.hasAttribute('title-page')
  }

  footnotes(_) {
    return ''
  }

  fontAwesomeStyle(node) {
    if (this.isSvgIconEnabled(node)) {
      return `<style>
${faDom.css()}
</style>`
    }
    return ''
  }

  async docinfoContent(node, docinfoLocation, suffix) {
    const content = await node.getDocinfo(docinfoLocation, suffix)
    return content || ''
  }

  syntaxHighlighterHead(node, syntaxHighlighter, attrs) {
    let header = ''
    if (syntaxHighlighter?.hasDocinfo('head')) {
      header = syntaxHighlighter.docinfo('head', node, attrs)
    }
    if (syntaxHighlighter?.hasDocinfo('footer')) {
      // reorder link elements from footer to header so stylesheets are available before rendering starts
      const footer = syntaxHighlighter.docinfo('footer', node, attrs)
      const matches = footer.match(this.linkStylesheet)
      if (matches !== null) {
        matches.forEach((element) => {
          header = header + element
        })
      }
    }
    return header
  }

  syntaxHighlighterFooter(node, syntaxHighlighter, attrs) {
    let footer = ''
    if (syntaxHighlighter?.hasDocinfo('footer')) {
      // skip all link elements in the footer as they are re-ordered to the header by syntaxHighlighterHead()
      footer = syntaxHighlighter.docinfo('footer', node, attrs)
      footer = footer.replace(this.linkStylesheet, '')
    }
    return footer
  }

  assetUriScheme(node) {
    let result = node.getAttribute('asset-uri-scheme', 'https')
    if (result.trim() !== '') {
      result = `${result}:`
    }
    return result
  }

  langAttr(node) {
    const attrNolang = node.getAttribute('nolang')
    if (attrNolang === '') {
      return ''
    }
    const attrLang = node.getAttribute('lang', 'en')
    return ` lang="${attrLang}"`
  }

  isSvgIconEnabled(node) {
    return (
      node.getDocument().isAttribute('icontype', 'svg') ||
      node.getDocument().isAttribute('icons', 'font')
    )
  }

  titlePage(node) {
    if (node.getDocumentTitle()) {
      const doc = node.getDocument()
      const doctitle = node.getDocumentTitle({ partition: true })
      const title = doctitle.hasSubtitle()
        ? `${doctitle.getMain()}<small class="subtitle">${doctitle.getSubtitle()}</small>`
        : doctitle.getMain()
      const revnumber = doc.getRevisionNumber()
      const revdate = doc.getRevisionDate()
      const revremark = doc.getRevisionRemark()
      const revisionInfo =
        revnumber || revdate || revremark
          ? `<div class="details">
  ${revnumber ? `<span id="revnumber">Version ${revnumber}</span>` : ''}
  ${revdate ? `<span id="revdate">${revdate}</span>` : ''}
  ${revremark ? `<span id="revremark">${revremark}</span>` : ''}
</div>`
          : ''
      if (this.hasTitlePage(doc)) {
        const author = doc.getAuthor()
        return `<div id="cover" class="title-page front-matter">
  <h1>${title}</h1>
  ${author ? `<h2>${author}</h2>` : ''}
  ${revisionInfo}
</div>`
      }
      return `<div class="title-document">
  <h1>${title}</h1>
  ${revisionInfo}
</div>`
    }
    return ''
  }

  /**
   * Generate an (hidden) outline otherwise Chrome won't generate "Dests" fields and we won't be able to generate a PDF outline.
   */
  outline(node, opts) {
    return `<div style="position:fixed;visibility:hidden;width:0;height:0;overflow:hidden;">${this.convert_outline(node, opts)}</div>`
  }

  tocHeader(node, opts) {
    if (node.hasHeader()) {
      const tocPlacement = node.getAttribute('toc-placement', 'auto')
      // Add a toc in the header if the toc placement is auto (default), left or right
      const hasTocPlacementHeader =
        tocPlacement === 'auto' ||
        tocPlacement === 'left' ||
        tocPlacement === 'right'
      if (
        node.hasSections() &&
        node.hasAttribute('toc') &&
        hasTocPlacementHeader
      ) {
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

export default DocumentPDFConverter

export const templates = {
  document: (node, opts) => instance.convert_document(node, opts),
  convert_outline: (node, opts) => instance.convert_outline(node, opts),
  admonition: (node) => instance.convert_admonition(node),
  example: (node) => instance.convert_example(node),
  inline_callout: (node) => instance.convert_inline_callout(node),
  inline_image: (node) => instance.convert_inline_image(node),
  inline_footnote: (node) => instance.convert_inline_footnote(node),
  colist: (node) => instance.convert_colist(node),
  page_break: (node) => instance.convert_page_break(node),
  preamble: (node) => instance.convert_preamble(node),
}
