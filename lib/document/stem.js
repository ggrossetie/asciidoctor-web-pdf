const fileUrl = require('file-url')
const ospath = require('path')

const mathjaxFileUrl = typeof process.pkg !== 'undefined' ?
  ospath.join(process.execPath, '..', 'assets/mathjax/tex-chtml-full.js') :
  fileUrl(require.resolve('mathjax/es5/tex-chtml-full.js'))

module.exports = {
  content: (node) => {
    // logic borrowed from Asciidoctor HTML5 converter
    if (node.getAttribute('stem') !== undefined) {
      let eqnumsValue = node.getAttribute('eqnums', 'none')
      if (eqnumsValue === '') {
        eqnumsValue = 'ams'
      } else {
        eqnumsValue = eqnumsValue.toLowerCase()
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
