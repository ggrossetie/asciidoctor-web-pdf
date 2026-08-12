import path from 'node:path'
import { pathToFileURL } from 'node:url'

const customStyleContent = (node) => {
  const stylesheet = node.getAttribute('stylesheet') || `${import.meta.dirname}/presentation.css`
  if (path.isAbsolute(stylesheet)) {
    return stylesheet
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
  return path.join(start, stylesheet)
}

const titleSliderHeader = (node) => {
  const doctitle = node.getDocumentTitle({ partition: true })
  if (doctitle.hasSubtitle()) {
    return `<h1>${doctitle.getMain()}</h1>
<h2>${doctitle.getSubtitle()}</h2>`
  }
  return `<h1>${node.getDocumentTitle()}</h1>`
}

const titleSlide = (node) => {
  return `<section class="title slide">
  <header>
    ${titleSliderHeader(node)}
  </header>
  <footer>
    <p class="author">${node.getDocument().getAuthor()}</p>
  </footer>
</section>`
}

const getImageCanvas = (node) => {
  const images = node.findBy({ context: 'image', role: 'canvas' })
  if (images && images.length > 0) {
    return images[0]
  }
  return undefined
}
const sectionInlineStyle = (node) => {
  const image = getImageCanvas(node)
  if (image) {
    const roles = node.getRoles()
    let backgroundSize
    if (roles && roles.includes('contain')) {
      backgroundSize = 'contain'
    } else {
      backgroundSize = 'cover'
    }
    return `style="background-image: url(${node.getImageUri(image.getAttribute('target'))}); background-size: ${backgroundSize}; background-repeat: no-repeat"`
  }
  return ''
}

const sectionTitle = (node) => {
  const titleSeparator = node.getDocument().getAttribute('title-separator') || ':'
  const parts = node.getTitle().split(titleSeparator)
  const main = parts[0]
  const subtitle = parts[1]
  if (subtitle) {
    return `<header>
  <h2>${main}</h2>
  <h3>${subtitle}</h3>
</header>`
  }
  return `<h2>${node.getTitle()}</h2>`
}

const sectionRoles = (node) => {
  const roles = node.getRoles() || []
  roles.unshift('slide')
  const image = getImageCanvas(node)
  if (image) {
    roles.push('image')
  }
  return roles
}

const outlineAnchors = (node) =>
  node.getSections().map((section) => {
    const id = section.getId()
    return id ? `<a href="#${id}"></a>${outlineAnchors(section)}` : outlineAnchors(section)
  }).join('')

const elementId = (node) => {
  const id = node.getId()
  if (id) {
    return ` id="${id}"`
  }
  return ''
}

export default {
  paragraph: async (node) => `<p class="${node.getRoles().join(' ')}">${await node.getContent()}</p>`,
  section: async (node) => {
    const id = node.getId()
    return `<section${id ? ` id="${id}"` : ''} class="${sectionRoles(node).join(' ')} ${node.getTitle() === '!' ? 'no-title' : ''}" data-slide-number="${node.index + 1}" data-slide-count="${node.parent.blocks.length}" ${sectionInlineStyle(node)}>
  ${sectionTitle(node)}
  ${await node.getContent()}
</section>`
  },
  document: async (node) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link href="${new URL('./asciidoctor.css', import.meta.url).href}" rel="stylesheet">
<link rel="stylesheet" href="${pathToFileURL(customStyleContent(node)).href}" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.13.1/styles/github.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.13.1/highlight.min.js"></script>
<script>
hljs.initHighlightingOnLoad();
</script>
</head>
<body>
<div style="position:fixed;visibility:hidden;width:0;height:0;overflow:hidden;">${outlineAnchors(node)}</div>
${titleSlide(node)}
${await node.getContent()}
</body>`,
  open: async (node) => `<div${elementId(node)} class="${node.getRoles().join(' ')}">${await node.getContent()}</div>`,
  image: (node) => {
    const roles = node.getRoles()
    if (roles && roles.includes('canvas')) {
      return ''
    }
    const height = node.getAttribute('height')
    const width = node.getAttribute('width')
    return `<figure class="image ${node.getRoles().join(' ')}"><img src="${node.getImageUri(node.getAttribute('target'))}" height="${height}" width="${width}"/></figure>`
  }
}
