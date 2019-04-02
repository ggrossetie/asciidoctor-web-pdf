module.exports = {
  paragraph: (node) => `<p class="paragraph">${node.getContent()}</p>`,
  document: (node) => `<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${node.getDocumentTitle()}</title>
  <link href="https://fonts.googleapis.com/css?family=Bitter|Fira+Sans:100,200,300,400,700" rel="stylesheet">
  <link rel="stylesheet" href="./style.css">
</head>
<body>
  <div class="page-bleed"></div>
  <div class="header">
    <h1>${node.getHeader().getTitle()}</h1>
  </div>
  <div id="content">
    ${node.getContent()}
  </div>
  <div class="footer"></div>
</body>`,
  section: (node) => {
        const title = node.getTitle() === '!' ? '' : `<h${node.getLevel()}>${node.getTitle()}</h${node.getLevel()}>`
        return `<div class="section section${node.getLevel()} ${node.getRole()}">
  ${title}
  ${node.getContent()}
</div>`
  }
}
