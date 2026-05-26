/* global Paged */
class RepeatingTableElements extends Paged.Handler {
  afterPageLayout(pageElement, _page, _breakToken, chunker) {
    // Find all split table elements
    const tables = pageElement.querySelectorAll('table[data-split-from]')

    tables.forEach((table) => {
      // Get the reference UUID of the node
      const ref = table.dataset.ref
      // Find the node in the original source
      const sourceTable = chunker.source.querySelector(`[data-ref='${ref}']`)
      // Repeat the <thead> element (if exists)
      this.repeatElement(sourceTable, table, ':scope > thead')
      // Repeat the <colgroup> elements (if at least one exists)
      this.repeatElements(sourceTable, table, ':scope > colgroup')
      // Repeat the <caption> element (if exists)
      this.repeatElement(sourceTable, table, ':scope > caption')
    })

    // Remove orphaned table headers at page breaks
    const fromTables = pageElement.querySelectorAll(
      'table:not([data-split-from])',
    )
    fromTables.forEach((table) => {
      const tbody = table.getElementsByTagName('tbody')[0]
      if (!tbody || tbody.children.length === 0) {
        table.parentNode.removeChild(table)
      }
    })
  }

  repeatElement(sourceTable, table, querySelector) {
    const element = sourceTable.querySelector(querySelector)
    if (element) {
      // Clone the element
      const clonedElement = element.cloneNode(true)
      // Insert the element at the start of the split table
      table.insertBefore(clonedElement, table.firstChild)
    }
  }

  repeatElements(sourceTable, table, querySelector) {
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
