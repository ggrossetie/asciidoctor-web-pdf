const fs = require('fs')
const ospath = require('path')
const cssDirectoryPath = `${__dirname}/../css`
const fontsDirectoryPath = `${__dirname}/../fonts`
const fonts = fs.readdirSync(fontsDirectoryPath)

// generate the @font-face definitions from the fonts directory
const startTag = '/* start:font-face */'
const endTag = '/* end:font-face */'
const data = []
data.push(startTag)
data.push(`/* Generated using ${ospath.relative(`${__dirname}/..`, __filename)} script */`)
data.push('/* DO NOT MANUALLY EDIT */')
for (const font of fonts) {
  const buff = fs.readFileSync(`${fontsDirectoryPath}/${font}`)
  let dataUriPrefix
  let fontFormat
  if (font.endsWith('.woff2')) {
    dataUriPrefix = 'data:application/font-woff2;charset=utf-8;base64,'
    fontFormat = 'woff2'
  } else {
    dataUriPrefix = 'data:font/truetype;charset=utf-8;base64,'
    fontFormat = 'truetype'
  }
  const basename = ospath.basename(font, ospath.extname(font))
  const parts = basename.split('-')
  const fontType = parts[1]
  let fontWeight
  if (fontType.startsWith('Light')) {
    fontWeight = 300
  } else if (fontType === 'Regular' || fontType === 'Italic') {
    fontWeight = 400
  } else if (fontType.startsWith('SemiBold')) {
    fontWeight = 600
  } else if (fontType.startsWith('Bold')) {
    fontWeight = 700
  } else {
    throw new Error('Unable to determine the font weight from the name. Aborting...')
  }
  let fontStyle = 'normal'
  if (fontType.includes('Italic')) {
    fontStyle = 'italic'
  }
  let unicodeRange = ''
  if (font === 'DroidSansMono-Regular.woff2') {
    unicodeRange = `  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
`
  }
  const fontFamily = parts[0].split(/(?=[A-Z])/).join(' ')
  const fontBase64 = buff.toString('base64')
  const template = `@font-face {
  font-family: '${fontFamily}';
  font-style: ${fontStyle};
  font-weight: ${fontWeight};
  font-display: block;
  src: url(${dataUriPrefix}${fontBase64}) format('${fontFormat}');
${unicodeRange}}`
  data.push(template)
}
data.push(endTag)

// Update asciidoctor.css file
const asciidoctorStyleFile = `${cssDirectoryPath}/asciidoctor.css`
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
