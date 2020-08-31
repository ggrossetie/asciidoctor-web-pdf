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
const fontsDirectory = `${__dirname}/../fonts`
fs.readdirSync(fontsDirectory).forEach((font) => {
  data.push(generateInlineFontFace(`${fontsDirectory}/${font}`, {
    fontFamilyCamelCaseToSpaceDelimited: true
  }))
})
data.push(endTag)

// Update asciidoctor.css file
const asciidoctorStyleFile = `${__dirname}/../css/asciidoctor.css`
const content = fs.readFileSync(asciidoctorStyleFile, 'utf8')
const start = content.indexOf(startTag)
const end = content.indexOf(endTag) + endTag.length
let before = ''
if (start > 0) {
  before = content.substring(0, start)
}
const after = content.substring(end, content.length)
const updatedContent = before + data.join('\n') + after
fs.writeFileSync(asciidoctorStyleFile, updatedContent, 'utf8')
