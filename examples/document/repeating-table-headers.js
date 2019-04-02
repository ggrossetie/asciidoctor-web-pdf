class RepeatingTableHeaders extends Paged.Handler {
  constructor(chunker, polisher, caller) {
    super(chunker, polisher, caller);
  }

  afterPageLayout(pageElement, page, breakToken, chunker) {
    // Find all split table elements
    let tables = pageElement.querySelectorAll("table[data-split-from]");

    tables.forEach((table) => {
      // Get the reference UUID of the node
      let ref = table.dataset.ref;
      // Find the node in the original source
      let sourceTable = chunker.source.querySelector("[data-ref='" + ref + "']");
      // Find if there is a header
      let header = sourceTable.querySelector("thead");
      if (header) {
        // Clone the header element
        let clonedHeader = header.cloneNode(true);
        // Insert the header at the start of the split table
        table.insertBefore(clonedHeader, table.firstChild);
      }
    });

  }
}

Paged.registerHandlers(RepeatingTableHeaders);
