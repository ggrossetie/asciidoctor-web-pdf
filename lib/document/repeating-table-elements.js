/* global Paged */
;(function () {
  class RepeatingTableElements extends Paged.Handler {
    constructor (chunker, polisher, caller) { // eslint-disable-line no-useless-constructor
      super(chunker, polisher, caller)
    }

    afterPageLayout (pageElement, page, breakToken, chunker) {
      // Find all split table elements
      const tables = pageElement.querySelectorAll('table[data-split-from]')

      tables.forEach((table) => {
        // Get the reference UUID of the node
        const ref = table.dataset.ref
        // Find the node in the original source
        const sourceTable = chunker.source.querySelector("[data-ref='" + ref + "']")
        // Repeat the <thead> element (if exists)
        this.repeatElement(sourceTable, table, 'thead')
        // Repeat the <colgroup> elements (if at least one exists)
        this.repeatElements(sourceTable, table, 'colgroup')
        // Repeat the <caption> element (if exists)
        this.repeatElement(sourceTable, table, 'caption')
      })
    }

    repeatElement (sourceTable, table, querySelector) {
      const element = sourceTable.querySelector(querySelector)
      if (element) {
        // Clone the element
        const clonedElement = element.cloneNode(true)
        // Insert the element at the start of the split table
        table.insertBefore(clonedElement, table.firstChild)
      }
    }

    repeatElements (sourceTable, table, querySelector) {
      const elements = sourceTable.querySelectorAll(querySelector)
      if (elements) {
        elements.forEach((element) => {
          // Clone the element
          const clonedElement = element.cloneNode(true)
          // Insert the element at the start of the split table
          table.insertBefore(clonedElement, table.firstChild)
        })
      }
    }
  }

  Paged.registerHandlers(RepeatingTableElements)
})()
