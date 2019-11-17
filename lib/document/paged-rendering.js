/* global Paged, PagedPolyfill */
window.AsciidoctorPDF = window.AsciidoctorPDF || {}
window.AsciidoctorPDF.status = 'rendering'
class PagedReadyHandler extends Paged.Handler {
  afterRendered (pages) {
    window.AsciidoctorPDF.status = 'ready'
  }

  // BEGIN: workaround to prevent duplicated content at end/beginning of page
  // https://gitlab.pagedmedia.org/tools/pagedjs/issues/126
  constructor (chunker, polisher, caller) {
    super(chunker, polisher, caller)
    this.carriageReturn = String.fromCharCode(10)
  }

  checkNode (node) {
    if (!node) return
    if (node.nodeType !== 3) return
    if (node.textContent === this.carriageReturn) {
      node.remove()
    }
  }

  afterParsed (parsed) {
    const template = document.querySelector('template').content
    const breakAfterAvoidElements = template.querySelectorAll('[data-break-after="avoid"], [data-break-before="avoid"]')
    for (const el of breakAfterAvoidElements) {
      this.checkNode(el.previousSibling)
      this.checkNode(el.nextSibling)
    }
  }
  // END: workaround to prevent duplicated content at end/beginning of page
}

Paged.registerHandlers(PagedReadyHandler)

window.PagedConfig = window.PagedConfig || {}

window.PagedConfig.auto = false

// same logic as pagedjs, but waiting for 'complete' instead of 'interactive'
const ready = new Promise(function (resolve, reject) {
  if (document.readyState === 'complete') {
    resolve(document.readyState)
    return
  }

  document.onreadystatechange = function () {
    if (document.readyState === 'complete') {
      resolve(document.readyState)
    }
  }
})

ready.then(async function () {
  const done = await PagedPolyfill.preview(window.PagedConfig.content, window.PagedConfig.stylesheets, window.PagedConfig.renderTo)
  if (window.PagedConfig.after) {
    await window.PagedConfig.after(done)
  }
})
