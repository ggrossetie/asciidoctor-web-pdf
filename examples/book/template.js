module.exports = [{
  paragraph: (ctx) => `<p class="${ctx.node.getRoles()}">${ctx.node.getContent()}</p>`,
  section: (ctx) => `<section class="chapter">
<h2>${ctx.node.getTitle()}</h2>
${ctx.node.getContent()}
</section>`,
  document: (ctx) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link href="./book.css" rel="stylesheet">
</head>
<body>
<div id="cover">
<h1>${ctx.node.getDocumentTitle()}</h1>
<h2>by ${ctx.node.getDocument().getAuthor()}</h2>
</div>
${ctx.node.getContent()}
</body>`,
  image: (ctx) => `<img class="image ${ctx.node.getRoles()}" src="${ctx.node.getImageUri(ctx.node.getAttribute('target'))}"/>`
}]
