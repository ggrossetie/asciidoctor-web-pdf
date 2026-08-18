import { PDFDict, PDFName, PDFRef } from 'pdf-lib'

const SubtypeName = PDFName.of('Subtype')
const LinkName = PDFName.of('Link')
const DestName = PDFName.of('Dest')
const DestsName = PDFName.of('Dests')

/**
 * Vivliostyle encodes named destinations as "viv-id-<full-source-URL>#<id>",
 * with every non-alphanumeric/underscore character percent-escaped as
 * ":XXXX" (4-digit hex). Since the source URL is a `file://` path, the
 * resulting PDF name token routinely exceeds several hundred bytes - well
 * past the 127-byte limit for name objects in the PDF spec (ISO 32000-1,
 * 7.3.5), which trips up strict validators (e.g. "name token is longer than
 * what the specification says it can be").
 *
 * This module resolves every reference to such a named destination - PDF
 * outline (bookmark) entries and in-page link annotations alike - to the
 * explicit destination array it points to, then drops the `/Dests` name
 * dictionary that held the oversized names in the first place.
 */

/**
 * Look up a named destination and return the explicit destination it points
 * to (a `[page Ref, /XYZ|/Fit|..., ...]` array, typically), resolving one
 * level of indirection if the dictionary stores it as a reference.
 *
 * @param {PDFDict|undefined} dests - The document's `/Dests` name dictionary
 *   (`context.lookup(catalog.get(PDFName.of('Dests')))`), or undefined if
 *   the document has none.
 * @param {import('pdf-lib').PDFContext} context
 * @param {PDFName} name - The named destination to resolve.
 * @returns {import('pdf-lib').PDFObject|undefined} The explicit destination,
 *   or undefined if `name` isn't a key of `dests`.
 */
export function resolveNamedDestination(dests, context, name) {
  if (!dests) {
    return undefined
  }
  const entry = dests.get(name)
  if (!entry) {
    return undefined
  }
  return context.lookup(entry) || entry
}

function getDests(pdfDoc) {
  return pdfDoc.context.lookup(pdfDoc.catalog.get(DestsName))
}

/**
 * Replace every link annotation's named `/Dest` (a `PDFName`) with the
 * explicit destination it resolves to, across every page. Annotations whose
 * `/Dest` is already explicit, or that can't be resolved against `/Dests`,
 * are left untouched.
 *
 * @param {import('pdf-lib').PDFDocument} pdfDoc
 * @returns {void}
 */
export function resolveLinkAnnotationDestinations(pdfDoc) {
  const dests = getDests(pdfDoc)
  if (!dests) {
    return
  }
  const context = pdfDoc.context
  for (const page of pdfDoc.getPages()) {
    const annots = page.node.Annots()
    if (!annots) {
      continue
    }
    for (let i = 0; i < annots.size(); i++) {
      const annot = context.lookup(annots.get(i))
      if (!(annot instanceof PDFDict)) {
        continue
      }
      if (annot.get(SubtypeName) !== LinkName) {
        continue
      }
      const destValue =
        context.lookup(annot.get(DestName)) || annot.get(DestName)
      if (!(destValue instanceof PDFName)) {
        continue
      }
      const resolved = resolveNamedDestination(dests, context, destValue)
      if (resolved) {
        annot.set(DestName, resolved)
      }
    }
  }
}

/**
 * Remove the document-level `/Dests` name dictionary - both the catalog
 * entry and, when it's stored as an indirect object, the underlying object
 * itself. Leaving the indirect object in place (even unreferenced) still
 * gets it written out on save, oversized name keys and all: `PDFDocument.save()`
 * serializes every object it knows about regardless of whether anything
 * still points to it, which was still tripping strict PDF parsers even
 * after every reference had been resolved to an explicit destination.
 *
 * Only call this after every named-destination reference has been resolved
 * (see `resolveLinkAnnotationDestinations` and `addOutline` in
 * `outline.js`) - removing it first would break any reference still using a
 * `PDFName`.
 *
 * @param {import('pdf-lib').PDFDocument} pdfDoc
 * @returns {void}
 */
export function removeNamedDestinations(pdfDoc) {
  const destsEntry = pdfDoc.catalog.get(DestsName)
  pdfDoc.catalog.delete(DestsName)
  if (destsEntry instanceof PDFRef) {
    pdfDoc.context.delete(destsEntry)
  }
}

/**
 * Run the full named-destination cleanup: resolve every in-page link
 * annotation's named `/Dest` to an explicit destination, then drop the
 * `/Dests` name dictionary. Must run after `addOutline`, which resolves the
 * outline (bookmark) entries' own named destinations.
 *
 * @param {import('pdf-lib').PDFDocument} pdfDoc
 * @returns {import('pdf-lib').PDFDocument}
 */
export function sanitizeNamedDestinations(pdfDoc) {
  resolveLinkAnnotationDestinations(pdfDoc)
  removeNamedDestinations(pdfDoc)
  return pdfDoc
}
