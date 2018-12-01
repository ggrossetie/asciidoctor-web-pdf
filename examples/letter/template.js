module.exports = {
  paragraph: (node) => `<p class="${node.getRoles().join(' ')}">${node.getContent()}</p>`,
  document: (node) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link href="./letter.css" rel="stylesheet">
</head>
<body>
${node.getContent()}
</body>`,
  image: (node) => `<div class="image ${node.getRoles().join(' ')}"><img src="${node.getImageUri(node.getAttribute('target'))}"/></div>`
}
