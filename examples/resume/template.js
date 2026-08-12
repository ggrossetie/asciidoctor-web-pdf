export default {
  paragraph: async (node) => `<p class="paragraph">${await node.getContent()}</p>`,
  document: async (node) => `<html lang="fr">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${node.getDocumentTitle()}</title>
    <link href="https://fonts.googleapis.com/css?family=Bitter|Fira+Sans:100,200,300,400,700" rel="stylesheet">
    <link rel="stylesheet" href="${new URL('./style.css', import.meta.url).href}">
  </head>
  <body>
    <div class="page-bleed"></div>
    <div class="header">
      <h1>${node.getHeader().getTitle()}</h1>
    </div>
    <div id="content">
      ${await node.getContent()}
    </div>
    <div class="footer"></div>
  </body>`,
  section: async (node) => {
        const title = node.getTitle() === '!' ? '' : `<h${node.getLevel()}>${node.getTitle()}</h${node.getLevel()}>`
        return `<div class="section section${node.getLevel()} ${node.getRole()}">
  ${title}
  ${await node.getContent()}
</div>`
  }
}
