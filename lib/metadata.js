const pkg = require('../package.json')

const addMetadata = async (pdfDoc, doc) => {
  let modificationDate, creationDate, creator
  if (doc.hasAttribute('reproducible')) {
    const date = new Date()
    date.setTime(0)
    modificationDate = date
    creationDate = date
    creator = 'Asciidoctor Web PDF'
  } else {
    try {
      modificationDate = new Date(doc.getAttribute('docdatetime'))
    } catch (e) {
      modificationDate = new Date()
    }
    try {
      creationDate = new Date(doc.getAttribute('localdatetime'))
    } catch (e) {
      creationDate = new Date()
    }
    creator = `Asciidoctor Web PDF ${pkg.version}`
  }
  const authors = doc.getAttribute('authors', '')
  const publisher = doc.getAttribute('publisher', '')
  pdfDoc.setTitle(doc.getDocumentTitle({ use_fallback: true }))
  pdfDoc.setAuthor(authors)
  pdfDoc.setSubject(doc.getAttribute('subject', ''))
  pdfDoc.setKeywords(doc.getAttribute('keywords', '').split(','))
  pdfDoc.setProducer(publisher || authors || creator)
  pdfDoc.setCreator(creator)
  pdfDoc.setCreationDate(creationDate)
  pdfDoc.setModificationDate(modificationDate)
  if (!doc.hasAttribute('nolang')) {
    const lang = doc.getAttribute('lang', 'en')
    pdfDoc.setLanguage(lang)
  }
  return pdfDoc
}

module.exports = {
  addMetadata: addMetadata
}
