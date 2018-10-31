module.exports = (ctx) => `<!DOCTYPE html>
<html dir="ltr" lang="en">
<head>
<meta charset="UTF-8">
<link href="./asciidoctor.css" rel="stylesheet">
<link href="./document.css" rel="stylesheet">
<script src="../../node_modules/pagedjs/dist/paged.polyfill.js"></script>
</head>
<body class="article">
<div id="cover">
<h1>${ctx.node.getDocumentTitle()}</h1>
<h2>${ctx.node.getDocument().getAuthor()}</h2>
</div>
<div id="content">
${ctx.node.getContent()}
</div>
<script>
window.PagedConfig = {
  auto: false,
  after: (flow) => { console.log("after", flow) }
};
</script>
</body>`
