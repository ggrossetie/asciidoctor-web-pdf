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

const renderAuthors = function (node) {
  const authors = getAuthors(node)
  return authors.map(author => {
    const authorImageUri = node.getMediaUri(`${author.twitter}.jpg`)
    return `<div class="author">
<div class="author-avatar"><img src="${authorImageUri}"/></div>
<div class="author-name"><a href="${author.email}">@${author.twitter}</a></div>
<div class="author-bio">${author.bio}</div>
</div>
`;
  }).join('\n')
}


export default {
  paragraph: async (node) => `<p class="${node.getRoles().join(' ')}">${await node.getContent()}</p>`,
  document: async (node) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link href="${new URL('./assets/style.css', import.meta.url).href}" rel="stylesheet">
</head>
<body>
<header>
  <img class="wordmark" src="${new URL('./assets/wordmark.svg', import.meta.url).href}"/>
  <h1>${node.getHeader().getTitle()}</h1>
  <a class="website" href="www.snyk.io">www.snyk.io</a>
  <img class="logo" src="${new URL('./assets/logo.svg', import.meta.url).href}"/>
</header>
<section class="content">
${await node.getContent()}
<div class="sect1 authors">
<h3>Authors :</h3>
${renderAuthors(node)}
</div>
</section>
</body>`
}
