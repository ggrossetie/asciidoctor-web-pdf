const fileUrl = require('file-url')
const mathjaxFileUrl = fileUrl(require.resolve('mathjax/unpacked/MathJax.js'))

module.exports = {
  content: (node) => {
    // logic borrowed from Asciidoctor HTML5 converter
    if (node.getAttribute('stem') !== undefined) {
      let eqnumsVal = node.getAttribute('eqnums')
      if (eqnumsVal === undefined) {
        eqnumsVal = 'none'
      }
      if (eqnumsVal === '') {
        eqnumsVal = 'AMS'
      }
      return `<script type="text/x-mathjax-config">
MathJax.Hub.Config({
  messageStyle: "none",
  tex2jax: {
    inlineMath: [["\\\\(", "\\\\)"]],
    displayMath: [["\\\\[", "\\\\]"]],
    ignoreClass: "nostem|nolatexmath"
  },
  asciimath2jax: {
    delimiters: [["\\\\$", "\\\\$"]],
    ignoreClass: "nostem|noasciimath"
  },
  TeX: { equationNumbers: { autoNumber: "${eqnumsVal}" } }
});
MathJax.Hub.Register.StartupHook("AsciiMath Jax Ready", function () {
  MathJax.InputJax.AsciiMath.postfilterHooks.Add(function (data, node) {
    if ((node = data.script.parentNode) && (node = node.parentNode) && node.classList.contains("stemblock")) {
      data.math.root.display = "block"
    }
    return data
  })
})
</script>
<script src="${mathjaxFileUrl}?config=TeX-MML-AM_HTMLorMML"></script>
<script>
  // defer relayouting by 'Paged' until 'MathJax' rendering is complete
  // otherwise formulas wouldn't be replaced and content height can't be calculated by 'Paged' 
  // 'MathJax' needs to be loaded before 'Paged' to make this work
  window.PagedConfig = {
    before: () => {
      return new Promise((resolve) => {
        window.MathJax.Hub.Queue(resolve);
      })
    }
  };
</script>`
    }
    return ''
  }
}
