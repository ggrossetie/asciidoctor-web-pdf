const fileUrl = require('file-url')
const mathjaxFileUrl = fileUrl(require.resolve('mathjax/es5/tex-chtml-full.js'))
const eqnumsValidValues = ['none', 'all', 'ams']

module.exports = {
  content: (node) => {
    // logic borrowed from Asciidoctor HTML5 converter
    if (node.getAttribute('stem') !== undefined) {
      let eqnumsValue = node.getAttribute('eqnums', 'none').toLowerCase()
      if (eqnumsValue.trim().length === 0) {
        // empty value is an alias for AMS-style equation numbering
        eqnumsValue = 'ams'
      }
      if (!eqnumsValidValues.includes(eqnumsValue)) {
        // invalid values are not allowed, use AMS-style equation numbering
        eqnumsValue = 'ams'
      }
      return `<script data-type="mathjax-config">
(() => {
  function adjustDisplay(math, _) {
    let node = math.start.node.parentNode
    if (node && (node = node.parentNode) && node.classList.contains('stemblock')) {
      math.root.attributes.set('display', 'block')
    }
  }

  window.MathJax = {
    tex: {
      inlineMath: [['\\\\(', '\\\\)']],
      displayMath: [['\\\\[', '\\\\]']],
      processEscapes: false,
      tags: "${eqnumsValue}"
    },
    options: {
      ignoreHtmlClass: 'nostem|noasciimath',
      renderActions: {
        adjustDisplay: [25, (doc) => {for (math of doc.math) {adjustDisplay(math, doc)}}, adjustDisplay]
      }
    },
    startup: {
      ready: () => {
        MathJax.startup.defaultReady()
        MathJax.startup.promise.then(resolve)
      }
    },
    asciimath: {
      delimiters: [['\\\\$', '\\\\$']]
    },
    loader: {load: ['input/asciimath', 'output/chtml', 'ui/menu']}
  }

  const mathJaxReadyPromise = new Promise((resolve) => {
    MathJax.startup = {
      ready: () => {
        MathJax.startup.defaultReady()
        MathJax.startup.promise.then(resolve)
      }
    }
  })

  // defer relayouting by 'Paged' until 'MathJax' rendering is complete
  // otherwise formulas wouldn't be replaced and content height can't be calculated by 'Paged' 
  // 'MathJax' needs to be loaded before 'Paged' to make this work
  window.PagedConfig = window.PagedConfig || {}
  window.PagedConfig.before = () => mathJaxReadyPromise
})()
</script>
<script type="text/javascript" src="${mathjaxFileUrl}"></script>`
    }
    return ''
  }
}
