module.exports = [{
  paragraph: (ctx) => `<p class="${ctx.node.getRoles()}">${ctx.node.getContent()}</p>`,
  section: (ctx) => `<section>${ctx.node.getContent()}</section>`,
  document: (ctx) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link href="./letter.css" rel="stylesheet">
</head>
<body>
${ctx.node.getContent()}
</body>`,
  image: (ctx) => {
    return `<div class="image ${ctx.node.getRoles()}"><img src="${ctx.node.getImageUri(ctx.node.getAttribute('target'))}"/></div>`
  }
}]
