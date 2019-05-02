const fs = require('fs')
module.exports = {
  document: (node) => {
    const repeatTableHeadersContent = fs.readFileSync(`${__dirname}/repeating-table-headers.js`, 'utf8')
    const pagedContent = fs.readFileSync(require.resolve('pagedjs/dist/paged.polyfill.js'), 'utf8')
    const asciidoctorStyleContent = fs.readFileSync(`${__dirname}/asciidoctor.css`, 'utf8')
    const documentStyleContent = fs.readFileSync(`${__dirname}/document.css`, 'utf8')
    return `<!DOCTYPE html>
<html dir="ltr" lang="en">
<head>
<meta charset="UTF-8">
<style>
${asciidoctorStyleContent}
${documentStyleContent}
</style>
<script>
${pagedContent}
${repeatTableHeadersContent}
</script>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body class="article">
<div id="cover">
<h1>${node.getDocumentTitle()}</h1>
<h2>${node.getDocument().getAuthor()}</h2>
</div>
<div id="content">
${node.getContent()}
</div>
</body>`
  }
}
