module.exports = {
  paragraph: (node) => `<p class="${node.getRoles().join(' ')}">${node.getContent()}</p>`,
  section: (node) => `<section class="chapter">
<h2>${node.getTitle()}</h2>
${node.getContent()}
</section>`,
  document: (node) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link href="./book.css" rel="stylesheet">
</head>
<body>
<div id="cover">
<h1>${node.getDocumentTitle()}</h1>
<h2>by ${node.getDocument().getAuthor()}</h2>
</div>
${node.getContent()}
</body>`,
  image: (node) => `<img class="image ${node.getRoles().join(' ')}" src="${node.getImageUri(node.getAttribute('target'))}"/>`
}
