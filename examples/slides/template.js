module.exports = {
  paragraph: (node) => `<p class="${node.getRoles()}">${node.getContent()}</p>`,

  section: (node) => `
<section class="slide ${node.getRoles()} ${node.getTitle() == '!' ? 'no-title' : ''}">
  <h2>${node.getTitle()}</h2>
  <div class='slide-content'>
    ${node.getContent()}
  </div>
  <footer class="small">
  <p>${node.index + 1} / ${node.parent.blocks.length}</p>
  </footer>
</section>`,

  document: (node) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link href="./asciidoctor.css" rel="stylesheet">
<link href="./slides.css" rel="stylesheet">
<link rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.13.1/styles/github.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.13.1/highlight.min.js"></script>
<script>
hljs.initHighlightingOnLoad();
</script>
</head>
<body>
<section class="slide" id="title-slide">
<h1>${node.getDocumentTitle()}</h1>
<h2>by ${node.getDocument().getAuthor()}</h2>
</section>
${node.getContent()}
</body>`,

  image: (node) => `<img class="image ${node.getRoles()}" src="${node.getImageUri(node.getAttribute('target'))}"/>`
}
