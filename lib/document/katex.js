const fs = require('fs')
const ospath = require('path')
const katexScriptContent = fs.readFileSync(require.resolve('katex/dist/katex.min.js'), 'utf8')
const katexAutoRenderContent = fs.readFileSync(require.resolve('katex/dist/contrib/auto-render.min.js'), 'utf8')
const stylesDirectoryPath = ospath.resolve(`${__dirname}/../../css`)
const katexStyleContent = fs.readFileSync(`${stylesDirectoryPath}/katex.css`, 'utf8')

module.exports = {
  content: (node) => {
    if (node.getAttribute('stem') !== undefined) {
      return `
<style>
${katexStyleContent}
</style>
<script data-id="katex">
${katexScriptContent}
${katexAutoRenderContent}
document.addEventListener("DOMContentLoaded", function() {
  renderMathInElement(document.body, {
    delimiters: [
      {left: "\\\\(", right: "\\\\)", display: false},
      {left: "\\\\[", right: "\\\\]", display: true}
    ]
  })
})
</script>`
    }
    return ''
  }
}
