const { PDFDict, PDFName, PDFNumber, PDFHexString } = require('pdf-lib')
const { decode: htmlEntitiesDecode } = require('html-entities')

const SanitizeXMLRx = /<[^>]+>/g

function sanitize (string) {
  if (string.includes('<')) {
    string = string.replace(SanitizeXMLRx, '')
  }
  return htmlEntitiesDecode(string)
}

function getOutline (node, depth) {
  if (depth === 0) {
    return []
  }
  return node.getSections()
    .filter(section => section.getId())
    .map(section => {
      const title = sanitize(section.getTitle())
      return {
        title: title,
        destination: section.getId(),
        children: getOutline(section, depth - 1)
      }
    })
}

function setRefsForOutlineItems (layer, context, parentRef) {
  for (const item of layer) {
    item.ref = context.nextRef()
    item.parentRef = parentRef
    setRefsForOutlineItems(item.children, context, item.ref)
  }
}

function countChildrenOfOutline (layer) {
  let count = 0
  for (const item of layer) {
    ++count
    count += countChildrenOfOutline(item.children)
  }
  return count
}

function buildPdfObjectsForOutline (layer, context) {
  for (const [i, item] of layer.entries()) {
    const prev = layer[i - 1]
    const next = layer[i + 1]

    const pdfObject = new Map([
      [PDFName.of('Title'), PDFHexString.fromText(item.title)],
      [PDFName.of('Dest'), PDFName.of(item.destination)],
      [PDFName.of('Parent'), item.parentRef]
    ])
    if (prev) {
      pdfObject.set(PDFName.of('Prev'), prev.ref)
    }
    if (next) {
      pdfObject.set(PDFName.of('Next'), next.ref)
    }
    if (item.children.length > 0) {
      pdfObject.set(PDFName.of('First'), item.children[0].ref)
      pdfObject.set(PDFName.of('Last'), item.children[item.children.length - 1].ref)
      pdfObject.set(PDFName.of('Count'), PDFNumber.of(countChildrenOfOutline(item.children)))
    }

    context.assign(item.ref, PDFDict.fromMapWithContext(pdfObject, context))

    buildPdfObjectsForOutline(item.children, context)
  }
}

function generateWarningsAboutMissingDestinations (layer, pdfDoc) {
  const dests = pdfDoc.context.lookup(pdfDoc.catalog.get(PDFName.of('Dests')))
  // Dests can be undefined if the PDF wasn't successfully generated (for instance if Paged.js threw an exception)
  if (dests) {
    const validDestinationTargets = dests.entries().map(([key, _]) => key.value())
    for (const item of layer) {
      if (!validDestinationTargets.includes('/' + item.destination)) {
        console.warn(`Unable to find destination ${item.destination} while generating PDF outline! \
This likely happened because an anchor link contained an umlaut (https://bugs.chromium.org/p/chromium/issues/detail?id=985254).`)
      }
      generateWarningsAboutMissingDestinations(item.children, pdfDoc)
    }
  }
}

async function addOutline (pdfDoc, doc) {
  const depth = doc.getAttribute('toclevels') || 2
  const context = pdfDoc.context
  const outlineRef = context.nextRef()

  const outline = getOutline(doc, depth)
  if (outline.length === 0) {
    return pdfDoc
  }
  generateWarningsAboutMissingDestinations(outline, pdfDoc)
  setRefsForOutlineItems(outline, context, outlineRef)
  buildPdfObjectsForOutline(outline, context)

  const outlineObject = PDFDict.fromMapWithContext(new Map([
    [PDFName.of('First'), outline[0].ref],
    [PDFName.of('Last'), outline[outline.length - 1].ref],
    [PDFName.of('Count'), PDFNumber.of(countChildrenOfOutline(outline))]
  ]), context)
  context.assign(outlineRef, outlineObject)

  pdfDoc.catalog.set(PDFName.of('Outlines'), outlineRef)
  return pdfDoc
}

module.exports = {
  addOutline: addOutline
}
