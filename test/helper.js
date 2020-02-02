const ospath = require('path')
const fs = require('fs')
const childProcess = require('child_process')
const PNG = require('pngjs').PNG
const pixelmatch = require('pixelmatch')

function outputDir () {
  return ospath.join(__dirname, 'output')
}

function outputFile (path) {
  return ospath.join(outputDir(), path)
}

function computeImageDifferences (referenceBuffer, actualBuffer, diffFilename) {
  const referenceImage = PNG.sync.read(referenceBuffer)
  const actualImage = PNG.sync.read(actualBuffer)
  const { width, height } = referenceImage
  const diff = new PNG({ width, height })
  const numDiffPixels = pixelmatch(referenceImage.data, actualImage.data, diff.data, width, height, { threshold: 0.1 })
  fs.writeFileSync(diffFilename, PNG.sync.write(diff))
  return numDiffPixels
}

function toVisuallyMatch (referenceFilename, actualPath) {
  let referencePath
  if (ospath.isAbsolute(referenceFilename)) {
    referencePath = referenceFilename
  } else {
    referencePath = ospath.join(__dirname, 'reference', referenceFilename)
  }

  if (!fs.existsSync(actualPath)) {
    return false
  }
  const imagesOutputDir = outputFile('visual-comparison-workdir')
  if (!fs.existsSync(imagesOutputDir)) {
    fs.mkdirSync(imagesOutputDir)
  }
  const actualBasename = ospath.basename(actualPath, '.pdf')
  const outputBasename = ospath.join(imagesOutputDir, `${actualBasename}`)
  childProcess.execFileSync('pdftocairo', ['-png', actualPath, `${outputBasename}-actual`])
  childProcess.execFileSync('pdftocairo', ['-png', referencePath, `${outputBasename}-reference`])

  let pixels = 0
  const tmpFiles = [actualPath]

  const currentFilenameRegexp = new RegExp(`${actualBasename}-(?:actual|reference)-([0-9]+).png`)
  const files = fs.readdirSync(imagesOutputDir)
  const indexes = new Set(files
    .filter((name) => name.match(currentFilenameRegexp))
    .map((name) => name.match(currentFilenameRegexp)[1]))
  for (const idx of indexes) {
    const referencePageFilename = `${outputBasename}-reference-${idx}.png`
    const referencePageExists = fs.existsSync(referencePageFilename)
    if (referencePageExists) {
      tmpFiles.push(referencePageFilename)
    }
    const actualPageFilename = `${outputBasename}-actual-${idx}.png`
    const actualPageExists = fs.existsSync(actualPageFilename)
    if (actualPageExists) {
      tmpFiles.push(actualPageFilename)
    }
    const referenceBuffer = fs.readFileSync(referencePageFilename)
    const actualBuffer = fs.readFileSync(actualPageFilename)
    if (referencePageExists && actualPageExists && referenceBuffer.compare(actualBuffer) === 0) {
      continue
    }
    pixels += computeImageDifferences(referenceBuffer, actualBuffer, `${outputBasename}-diff-${idx}.png`)
  }
  if (pixels > 0) {
    if (typeof process.env.DEBUG === 'undefined') {
      tmpFiles.forEach((file) => fs.unlinkSync(file))
    }
    return pixels
  } else {
    return pixels
  }
}

module.exports = (chai) => {
  chai.use(function (_chai, _) {
    _chai.Assertion.addMethod('visuallyIdentical', function (reference) {
      const obj = this._obj
      const result = toVisuallyMatch(reference, obj)
      const objRelativePath = ospath.relative(__dirname, obj)
      this.assert(
        result === 0
        , `expected ${objRelativePath} to be visually identical to reference/${reference} but has ${result} pixels difference`
        , `expected ${objRelativePath} to not be visually identical to reference/${reference} but has 0 pixel difference`
        , 0
        , result
      )
    })
  })
}
