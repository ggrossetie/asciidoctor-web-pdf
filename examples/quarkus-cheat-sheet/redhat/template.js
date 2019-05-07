const getAuthors = function (node) {
  const result = [];
  const authorCount = node.getAttribute('authorcount')
  if (authorCount > 1) {
    for (let index = 1; index < authorCount + 1; index++) {
      const author = node.getAttribute(`author_${index}`)
      const email = node.getAttribute(`email_${index}`)
      const bio = node.getAttribute(`authorbio_${index}`)
      let twitter;
      if (email && email.startsWith("https://twitter.com/")) {
        twitter = email.replace("https://twitter.com/", "");
      }
      result.push({ name: author, email: email, bio: bio, twitter: twitter })
    }
  } else {
    const author = node.getAttribute('author')
    const email = node.getAttribute('email')
    const bio = node.getAttribute(`authorbio`)
    let twitter;
    if (email && email.startsWith("https://twitter.com/")) {
      twitter = email.replace("https://twitter.com/", "");
    }
    result.push({ name: author, email: email, bio: bio, twitter: twitter })
  }
  return result;
}

const renderAuthors = function (authors) {
  return authors.map(author => {
    return `<div class="author">
<div class="author-avatar"><img src="http://avatars.io/twitter/${author.twitter}"/></div>
<div class="author-name"><a href="${author.email}">@${author.twitter}</a></div>
<div class="author-bio">${author.bio}</div>
</div>
`;
  }).join('\n')
}

module.exports = [{
  paragraph: (ctx) => `<p class="${ctx.node.getRoles()}">${ctx.node.getContent()}</p>`,
  document: (ctx) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link href="./redhat/assets/style.css" rel="stylesheet">
</head>
<body>
<header>
  <h1>${ctx.node.getHeader().getTitle()}</h1>
  <img class="logo" src="./redhat/assets/${ctx.node.getAttribute('logo')}"/>
</header>
<section class="content">
${ctx.node.getContent()}
<div class="sect1 authors">
<h3>Authors :</h3>
${renderAuthors(getAuthors(ctx.node))}
<div class="author-bio">${ctx.node.getAttribute('version')}</div>
<img src="./redhat/assets/by-nc-sa.png"/>
</div>

</section>
</body>`,
  page_break: () => `<div class="page-break"></div>`
}]