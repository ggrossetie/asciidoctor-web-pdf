import { createRequire } from 'node:module'
import ospath from 'node:path'
import { pathToFileURL } from 'node:url'
import MathJaxModule from 'mathjax'

const require = createRequire(import.meta.url)

const isSea = (() => {
  try {
    return require('node:sea').isSea()
  } catch {
    return false
  }
})()

function getFontURL() {
  if (isSea) {
    return pathToFileURL(
      ospath.join(ospath.dirname(process.execPath), 'assets', 'mathjax-fonts'),
    ).href
  }
  const fontPkgPath = ospath.dirname(
    require.resolve('@mathjax/mathjax-newcm-font/package.json'),
  )
  return pathToFileURL(ospath.join(fontPkgPath, 'chtml', 'woff2')).href
}

const instances = new Map()

async function getMathJax(tags) {
  if (!instances.has(tags)) {
    if (isSea) {
      // esbuild sets __dirname to the binary dir at bundle time, so node-main.js
      // derives the wrong paths.mathjax; override it before the first init().
      MathJaxModule.config.loader.paths.mathjax = ospath.join(
        ospath.dirname(process.execPath),
        'assets',
        'mathjax',
      )
      // node-main.js sets loader.require to eval("(file) => import(file)") which
      // uses dynamic ESM import. SEA binaries run in CJS-only mode, so import()
      // of external files does not work. Replace with a plain CJS require instead.
      MathJaxModule.config.loader.require = require
    }
    instances.set(
      tags,
      MathJaxModule.init({
        loader: { load: ['input/tex', 'input/asciimath', 'output/chtml'] },
        tex: {
          inlineMath: [['\\(', '\\)']],
          displayMath: [['\\[', '\\]']],
          processEscapes: false,
          tags,
        },
        asciimath: { delimiters: [['\\$', '\\$']] },
        chtml: { fontURL: getFontURL() },
        startup: { typeset: false },
      }),
    )
  }
  return instances.get(tags)
}

export async function processStem(html, node) {
  if (node.getAttribute('stem') == null) return html

  let tags = node.getAttribute('eqnums', 'none')
  if (tags === '') tags = 'ams'
  else tags = tags.toLowerCase()

  const mj = await getMathJax(tags)
  const adaptor = mj.startup.adaptor

  let result = html

  // Display math inside .stemblock divs (AsciiMath \$...\$ or TeX \[...\])
  result = result.replace(
    /(<div class="stemblock">[\s\S]*?<div class="content">)([\s\S]*?)(<\/div>[\s\S]*?<\/div>)/g,
    (_, before, content, after) => {
      content = content.replace(/\\\$([\s\S]*?)\\\$/g, (__, f) => {
        const node = mj.asciimath2chtml(f.trim(), { display: true })
        adaptor.setAttribute(node, 'display', 'true')
        return adaptor.outerHTML(node)
      })
      content = content.replace(/\\\[([\s\S]*?)\\\]/g, (__, f) => {
        const node = mj.tex2chtml(f.trim(), { display: true })
        adaptor.setAttribute(node, 'display', 'true')
        return adaptor.outerHTML(node)
      })
      return before + content + after
    },
  )

  // Inline TeX: \(...\)
  result = result.replace(/\\\(([\s\S]*?)\\\)/g, (_, f) =>
    adaptor.outerHTML(mj.tex2chtml(f.trim(), { display: false })),
  )

  // Inline AsciiMath: \$...\$
  result = result.replace(/\\\$([\s\S]*?)\\\$/g, (_, f) =>
    adaptor.outerHTML(mj.asciimath2chtml(f.trim(), { display: false })),
  )

  // Inject CHTML stylesheet after all expressions are rendered so all
  // per-character CSS rules (e.g. mjx-c.mjx-c221A for √) are included
  const cssHTML = adaptor.outerHTML(mj.chtmlStylesheet())
  result = result.replace('</head>', `${cssHTML}\n</head>`)

  return result
}
