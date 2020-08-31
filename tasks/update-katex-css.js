const fs = require('fs')
const ospath = require('path')
const { generateInlineFontFace } = require('./font.js')

// generate the @font-face definitions from the fonts directory
const startTag = '/* start:font-face */'
const endTag = '/* end:font-face */'
const data = []
data.push(startTag)
data.push(`/* Generated using ${ospath.relative(`${__dirname}/..`, __filename)} script */`)
data.push('/* DO NOT MANUALLY EDIT */')
const fontsDirectory = ospath.dirname(require.resolve('katex/dist/fonts/KaTeX_Main-Regular.woff2'))
fs.readdirSync(fontsDirectory)
  .filter((font) => font.endsWith('.woff2'))
  .forEach((font) => {
    data.push(generateInlineFontFace(`${fontsDirectory}/${font}`))
  })
data.push(endTag)

// Update katex.css file
let content = fs.readFileSync(require.resolve('katex/dist/katex.css'), 'utf8')
// remove single-line comment
content = content.replace(/\/\*.*\*\/\n/g, '')
// remove @font-face blocks
content = content.replace(/@font-face {[^}]+}\n/gm, '')
const updatedContent = data.join('\n') + content
fs.writeFileSync(`${__dirname}/../css/katex.css`, updatedContent, 'utf8')
