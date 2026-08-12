export default {
  paragraph: async (node) => `<p class="${node.getRoles().join(' ')}">${await node.getContent()}</p>`,
  document: async (node) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link href="${new URL('./letter.css', import.meta.url).href}" rel="stylesheet">
</head>
<body>
${await node.getContent()}
</body>`,
  image: async (node) => `<div class="image ${node.getRoles().join(' ')}"><img src="${await node.getImageUri(node.getAttribute('target'))}"/></div>`
}
