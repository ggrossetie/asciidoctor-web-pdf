import { createRequire } from 'node:module'
import ospath from 'node:path'
import fileUrl from 'file-url'

const require = createRequire(import.meta.url)

const isSea = (() => {
  try {
    return require('node:sea').isSea()
  } catch {
    return false
  }
})()
const isPkg = typeof process.pkg !== 'undefined'

const mathjaxFileUrl = isPkg
  ? ospath.join(process.execPath, '..', 'assets/mathjax/tex-chtml-full.js')
  : isSea
    ? fileUrl(
        ospath.join(
          ospath.dirname(process.execPath),
          'assets',
          'mathjax',
          'tex-chtml-full.js',
        ),
      )
    : fileUrl(require.resolve('mathjax/es5/tex-chtml-full.js'))

export default {
  content: (node) => {
    if (node.getAttribute('stem') != null) {
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

  window.AsciidoctorPDF = window.AsciidoctorPDF || {}
  window.AsciidoctorPDF.beforeRender = () => mathJaxReadyPromise
})()
</script>
<script type="text/javascript" src="${mathjaxFileUrl}"></script>`
    }
    return ''
  },
}
