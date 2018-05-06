module.exports = [{
  paragraph: (ctx) => `<p class="${ctx.node.getRoles()}">${ctx.node.getContent()}</p>`,
  document: (ctx) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link href="./letter.css" rel="stylesheet">
</head>
<body>
${ctx.node.getContent()}
</body>`,
  image: (ctx) => `<div class="image ${ctx.node.getRoles()}"><img src="${ctx.node.getImageUri(ctx.node.getAttribute('target'))}"/></div>`
}]
