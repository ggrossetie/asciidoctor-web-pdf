import { decode as htmlEntitiesDecode } from 'html-entities'
import { PDFDict, PDFHexString, PDFName, PDFNumber } from 'pdf-lib'

const SanitizeXMLRx = /<[^>]+>/g

function sanitize(string) {
  if (string.includes('<')) {
    string = string.replace(SanitizeXMLRx, '')
  }
  return htmlEntitiesDecode(string)
}

// Vivliostyle encodes source document anchors as "viv-id-<encoded-url>#<id>"
// where non-alphanumeric/underscore chars are replaced by ":XXXX" (4-digit hex).
function toVivliostyleDest(docUrl, sectionId) {
  const fullUrl = `${docUrl}#${sectionId}`
  return (
    'viv-id-' +
    fullUrl.replace(
      /[^A-Za-z0-9_-]/g,
      (c) => `:${c.charCodeAt(0).toString(16).padStart(4, '0')}`,
    )
  )
}

function getOutline(node, depth, docUrl) {
  if (depth === 0) {
    return []
  }
  return node
    .getSections()
    .filter((section) => section.getId())
    .map((section) => {
      const title = sanitize(section.getTitle())
      const sectionId = section.getId()
      return {
        title,
        destination: docUrl ? toVivliostyleDest(docUrl, sectionId) : sectionId,
        children: getOutline(section, depth - 1, docUrl),
      }
    })
}

function setRefsForOutlineItems(layer, context, parentRef) {
  for (const item of layer) {
    item.ref = context.nextRef()
    item.parentRef = parentRef
    setRefsForOutlineItems(item.children, context, item.ref)
  }
}

function countChildrenOfOutline(layer) {
  let count = 0
  for (const item of layer) {
    ++count
    count += countChildrenOfOutline(item.children)
  }
  return count
}

function buildPdfObjectsForOutline(layer, context, dests) {
  for (const [i, item] of layer.entries()) {
    const prev = layer[i - 1]
    const next = layer[i + 1]

    // Resolve named destination to explicit page-based destination to avoid
    // long PDF name tokens (Vivliostyle uses full encoded URLs as dest names)
    let dest
    if (dests) {
      const destEntry = dests.get(PDFName.of(item.destination))
      if (destEntry) {
        dest = context.lookup(destEntry) || destEntry
      }
    }
    if (!dest) {
      dest = PDFName.of(item.destination)
    }

    const pdfObject = new Map([
      [PDFName.of('Title'), PDFHexString.fromText(item.title)],
      [PDFName.of('Dest'), dest],
      [PDFName.of('Parent'), item.parentRef],
    ])
    if (prev) {
      pdfObject.set(PDFName.of('Prev'), prev.ref)
    }
    if (next) {
      pdfObject.set(PDFName.of('Next'), next.ref)
    }
    if (item.children.length > 0) {
      pdfObject.set(PDFName.of('First'), item.children[0].ref)
      pdfObject.set(
        PDFName.of('Last'),
        item.children[item.children.length - 1].ref,
      )
      pdfObject.set(
        PDFName.of('Count'),
        PDFNumber.of(countChildrenOfOutline(item.children)),
      )
    }

    context.assign(item.ref, PDFDict.fromMapWithContext(pdfObject, context))

    buildPdfObjectsForOutline(item.children, context, dests)
  }
}

function filterMissingDestinations(layer, validDestinationTargets) {
  return layer
    .filter((item) => validDestinationTargets.includes(`/${item.destination}`))
    .map((item) => ({
      ...item,
      children: filterMissingDestinations(
        item.children,
        validDestinationTargets,
      ),
    }))
}

export async function addOutline(pdfDoc, doc, docUrl) {
  const depth = doc.getAttribute('toclevels') || 2
  const context = pdfDoc.context
  const outlineRef = context.nextRef()
  const dests = context.lookup(pdfDoc.catalog.get(PDFName.of('Dests')))

  let outline = getOutline(doc, depth, docUrl)
  if (outline.length === 0) {
    return pdfDoc
  }
  if (dests) {
    const validDestinationTargets = dests.entries().map(([key]) => key.value())
    outline = filterMissingDestinations(outline, validDestinationTargets)
  }
  if (outline.length === 0) {
    return pdfDoc
  }
  setRefsForOutlineItems(outline, context, outlineRef)
  buildPdfObjectsForOutline(outline, context, dests)

  const outlineObject = PDFDict.fromMapWithContext(
    new Map([
      [PDFName.of('First'), outline[0].ref],
      [PDFName.of('Last'), outline[outline.length - 1].ref],
      [PDFName.of('Count'), PDFNumber.of(countChildrenOfOutline(outline))],
    ]),
    context,
  )
  context.assign(outlineRef, outlineObject)

  pdfDoc.catalog.set(PDFName.of('Outlines'), outlineRef)
  return pdfDoc
}
