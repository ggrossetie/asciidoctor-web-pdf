const fs = require('fs')
const ospath = require('path')

module.exports = {
  generateInlineFontFace (fontFilePath, options) {
    options = options || {}
    const fontFileName = ospath.basename(fontFilePath)
    const fontExtension = ospath.extname(fontFileName)
    const buff = fs.readFileSync(fontFilePath)
    let dataUriPrefix
    let fontFormat
    if (fontExtension === '.woff2') {
      dataUriPrefix = 'data:application/font-woff2;charset=utf-8;base64,'
      fontFormat = 'woff2'
    } else if (fontExtension === '.ttf') {
      dataUriPrefix = 'data:font/truetype;charset=utf-8;base64,'
      fontFormat = 'truetype'
    } else if (fontExtension === '.woff') {
      dataUriPrefix = 'data:font/woff;charset=utf-8;base64,'
      fontFormat = 'woff'
    } else {
      throw new Error(`Unsupported font extension: "${fontExtension}", must be either ".woff2" or ".ttf". Aborting...`)
    }
    const fontBaseName = ospath.basename(fontFileName, fontExtension)
    const parts = fontBaseName.split('-')
    const fontType = parts[1]
    let fontWeight = 400
    let fontStyle = 'normal'
    if (fontType) {
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
      if (fontType.includes('Italic')) {
        fontStyle = 'italic'
      }
    }
    let unicodeRange = ''
    if (fontFileName === 'DroidSansMono-Regular.woff2') {
      unicodeRange = `  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
`
    }
    const fontFamily = options.fontFamilyResolver
      ? options.fontFamilyResolver(fontBaseName)
      : parts[0]
    const fontBase64 = buff.toString('base64')
    return `@font-face {
  font-family: '${fontFamily}';
  font-style: ${fontStyle};
  font-weight: ${fontWeight};
  font-display: block;
  src: url(${dataUriPrefix}${fontBase64}) format('${fontFormat}');
${unicodeRange}}`
  }
}
