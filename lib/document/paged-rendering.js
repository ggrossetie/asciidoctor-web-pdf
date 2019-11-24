window.AsciidoctorPDF = window.AsciidoctorPDF || {}
window.AsciidoctorPDF.status = 'rendering'
class PagedReadyHandler extends Paged.Handler {
  afterRendered(pages) {
    window.AsciidoctorPDF.status = 'ready'
  }
}
Paged.registerHandlers(PagedReadyHandler);

window.PagedConfig = window.PagedConfig || {}

window.PagedConfig.auto = false

// same logic as pagedjs, but waiting for 'complete' instead of 'interactive'
let ready = new Promise(function(resolve, reject){
  if (document.readyState === "complete") {
    resolve(document.readyState);
    return;
  }

  document.onreadystatechange = function () {
    if (document.readyState === "complete") {
      resolve(document.readyState);
    }
  };
});

ready.then(async function () {
  done = await PagedPolyfill.preview(window.PagedConfig.content, window.PagedConfig.stylesheets, window.PagedConfig.renderTo);
  if (window.PagedConfig.after) {
    await window.PagedConfig.after(done);
  }
});
