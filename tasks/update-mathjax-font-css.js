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
const fontsDirectory = ospath.dirname(require.resolve('mathjax/es5/output/chtml/fonts/woff-v2/MathJax_Main-Regular.woff'))
fs.readdirSync(fontsDirectory)
  .forEach((font) => {
    data.push(generateInlineFontFace(`${fontsDirectory}/${font}`, {
      fontFamilyResolver: (fontBaseName) => {
        if (fontBaseName === 'MathJax_Main-Regular') {
          return 'MJXTEX'
        }
        if (fontBaseName === 'MathJax_Main-Bold') {
          return 'MJXTEX-B'
        }
        if (fontBaseName === 'MathJax_Math-Italic') {
          return 'MJXTEX-I'
        }
        if (fontBaseName === 'MathJax_Main-Italic') {
          return 'MJXTEX-MI'
        }
        if (fontBaseName === 'MathJax_Math-BoldItalic') {
          return 'MJXTEX-BI'
        }
        if (fontBaseName === 'MathJax_Size1-Regular') {
          return 'MJXTEX-S1'
        }
        if (fontBaseName === 'MathJax_Size2-Regular') {
          return 'MJXTEX-S2'
        }
        if (fontBaseName === 'MathJax_Size3-Regular') {
          return 'MJXTEX-S3'
        }
        if (fontBaseName === 'MathJax_Size4-Regular') {
          return 'MJXTEX-S4'
        }
        if (fontBaseName === 'MathJax_AMS-Regular') {
          return 'MJXTEX-A'
        }
        if (fontBaseName === 'MathJax_Calligraphic-Regular') {
          return 'MJXTEX-C'
        }
        if (fontBaseName === 'MathJax_Calligraphic-Bold') {
          return 'MJXTEX-CB'
        }
        if (fontBaseName === 'MathJax_Fraktur-Regular') {
          return 'MJXTEX-FR'
        }
        if (fontBaseName === 'MathJax_Fraktur-Bold') {
          return 'MJXTEX-FRB'
        }
        if (fontBaseName === 'MathJax_SansSerif-Regular') {
          return 'MJXTEX-SS'
        }
        if (fontBaseName === 'MathJax_SansSerif-Bold') {
          return 'MJXTEX-SSB'
        }
        if (fontBaseName === 'MathJax_SansSerif-Italic') {
          return 'MJXTEX-SSI'
        }
        if (fontBaseName === 'MathJax_Script-Regular') {
          return 'MJXTEX-SC'
        }
        if (fontBaseName === 'MathJax_Typewriter-Regular') {
          return 'MJXTEX-T'
        }
        if (fontBaseName === 'MathJax_Vector-Regular') {
          return 'MJXTEX-V'
        }
        if (fontBaseName === 'MathJax_Vector-Bold') {
          return 'MJXTEX-VB'
        }
      }
    }))
  })
data.push(endTag)

// Update katex.css file
const updatedContent = data.join('\n')
fs.writeFileSync(`${__dirname}/../css/mathjax.css`, updatedContent, 'utf8')
