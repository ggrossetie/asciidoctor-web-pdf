module.exports = (ctx) => `<!DOCTYPE html>
<html dir="ltr" lang="en">
<head>
<meta charset="UTF-8">
<link href="./asciidoctor.css" rel="stylesheet">
<link href="./document.css" rel="stylesheet">
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" rel="stylesheet">
</head>
<body class="article">
<div id="cover">
<h1>${ctx.node.getDocumentTitle()}</h1>
<h2>${ctx.node.getDocument().getAuthor()}</h2>
</div>
<div id="content">
${ctx.node.getContent()}
</div>
</body>`
