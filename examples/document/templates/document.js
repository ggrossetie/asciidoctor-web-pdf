module.exports = (node) => `<!DOCTYPE html>
<html dir="ltr" lang="en">
<head>
<meta charset="UTF-8">
<link href="asciidoctor.css" rel="stylesheet">
<link href="document.css" rel="stylesheet">
<script src="paged.polyfill.js"></script>
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
