const { PDFDict, PDFDocument, PDFName, PDFNumber, PDFString } = require('pdf-lib')

function getOutline (node, depth) {
  if (depth === 0) {
    return []
  }

  return node.getSections().map(section => ({
    title: section.getTitle(),
    destination: section.getId(),
    children: getOutline(section, depth - 1)
  }))
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
      [PDFName.of('Title'), PDFString.of(item.title)],
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
  const validDestinationTargets = dests.entries().map(([key, _]) => key.value())
  for (const item of layer) {
    if (!validDestinationTargets.includes('/' + item.destination)) {
      console.warn(`Unable to find destination ${item.destination} ` +
        'while generating PDF outline! This likely happened because ' +
        'an anchor link contained an umlaut ' +
        '(https://bugs.chromium.org/p/chromium/issues/detail?id=985254).')
    }
    generateWarningsAboutMissingDestinations(item.children, pdfDoc)
  }
}

async function addOutline (pdf, doc) {
  const depth = doc.getAttribute('toclevels') || 2
  const pdfDoc = await PDFDocument.load(pdf)
  const context = pdfDoc.context
  const outlineRef = context.nextRef()

  const outline = getOutline(doc, depth)
  if (outline.length === 0) {
    return pdf
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
  return pdfDoc.save()
}

module.exports = {
  addOutline: addOutline
}
