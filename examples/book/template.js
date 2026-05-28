export default {
  paragraph: async (node) => `<p class="${node.getRoles().join(' ')}">${await node.getContent()}</p>`,
  section: async (node) => `<section class="chapter">
<h2>${node.getTitle()}</h2>
${await node.getContent()}
</section>`,
  document: async (node) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link href="${new URL('./book.css', import.meta.url).href}" rel="stylesheet">
</head>
<body>
<div id="cover">
<h1>${node.getDocumentTitle()}</h1>
<h2>by ${node.getDocument().getAuthor()}</h2>
</div>
${await node.getContent()}
</body>`,
  image: async (node) => `<img class="image ${node.getRoles().join(' ')}" src="${await node.getImageUri(node.getAttribute('target'))}"/>`
}
