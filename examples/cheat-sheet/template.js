module.exports = [{
  paragraph: (ctx) => `<p class="${ctx.node.getRoles()}">${ctx.node.getContent()}</p>`,
  document: (ctx) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link href="./cheat-sheet.css" rel="stylesheet">
</head>
<body>
<header>
<h1>${ctx.node.getHeader().getTitle()}</h1>
</header>
<section class="content">
${ctx.node.getContent()}
</section>
</body>`
}]
