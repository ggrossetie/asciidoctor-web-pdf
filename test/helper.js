import childProcess from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import ospath from 'node:path'
import { default as pixelmatch } from 'pixelmatch'
import { PNG } from 'pngjs'

const __dirname = import.meta.dirname

function outputDir() {
  return ospath.join(__dirname, 'output')
}

function outputFile(path) {
  return ospath.join(outputDir(), path)
}

export function extractText(pdfPath) {
  return childProcess.execFileSync('pdftotext', ['-layout', pdfPath, '-'], {
    encoding: 'utf8',
  })
}

// Returns the exact glyph position (in PDF points) of every word, decoded from
// pdftotext's XML bbox output. Unlike extractText(), this isn't affected by
// -layout's approximate reconstruction of column widths from font metrics.
export function extractWordBoxes(pdfPath) {
  const xml = childProcess.execFileSync('pdftotext', ['-bbox', pdfPath, '-'], {
    encoding: 'utf8',
  })
  const decodeEntities = (text) =>
    text
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
  return [
    ...xml.matchAll(
      /<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)"[^>]*>([^<]*)<\/word>/g,
    ),
  ].map((match) => ({
    xMin: Number(match[1]),
    yMin: Number(match[2]),
    xMax: Number(match[3]),
    yMax: Number(match[4]),
    text: decodeEntities(match[5]),
  }))
}

// Renders a single PDF page to a decoded PNG, for pixel-level assertions
// (e.g. checking for a border line) that plain text extraction can't make.
export function renderPageToPNG(pdfPath, pageIndex = 1, dpi = 150) {
  const outBase = pdfPath.replace(/\.pdf$/, '')
  childProcess.execFileSync(
    'pdftocairo',
    [
      '-png',
      '-r',
      String(dpi),
      '-f',
      String(pageIndex),
      '-l',
      String(pageIndex),
      pdfPath,
      outBase,
    ],
    { stdio: 'pipe' },
  )
  const pngPath = `${outBase}-${pageIndex}.png`
  const png = PNG.sync.read(fs.readFileSync(pngPath))
  fs.unlinkSync(pngPath)
  return png
}

// True if the pixel at the given PDF point coordinates (top-left origin, as
// reported by pdftotext -bbox) is darker than a plain white/near-white
// background, i.e. a border or text/ink pixel.
export function hasInkAt(png, dpi, xPt, yPt) {
  const scale = dpi / 72
  const x = Math.round(xPt * scale)
  const y = Math.round(yPt * scale)
  const idx = (png.width * y + x) << 2
  return (
    png.data[idx] < 240 || png.data[idx + 1] < 240 || png.data[idx + 2] < 240
  )
}

function computeImageDifferences(referenceBuffer, actualBuffer, diffFilename) {
  const referenceImage = PNG.sync.read(referenceBuffer)
  const actualImage = PNG.sync.read(actualBuffer)
  const { width, height } = referenceImage
  const diff = new PNG({ width, height })
  const numDiffPixels = pixelmatch(
    referenceImage.data,
    actualImage.data,
    diff.data,
    width,
    height,
    { threshold: 0.1 },
  )
  fs.writeFileSync(diffFilename, PNG.sync.write(diff))
  return numDiffPixels
}

export function toVisuallyMatch(referenceFilename, actualPath) {
  const platform = os.platform() === 'darwin' ? 'macos' : 'linux'
  let referencePath
  if (ospath.isAbsolute(referenceFilename)) {
    referencePath = referenceFilename
  } else {
    referencePath = ospath.join(
      __dirname,
      'reference',
      platform,
      referenceFilename,
    )
  }

  if (!fs.existsSync(actualPath)) {
    throw new Error(`File does not exist: ${actualPath}`)
  }
  const imagesOutputDir = outputFile('visual-comparison-workdir')
  if (!fs.existsSync(imagesOutputDir)) {
    fs.mkdirSync(imagesOutputDir)
  }
  const actualBasename = ospath.basename(actualPath, '.pdf')
  const outputBasename = ospath.join(imagesOutputDir, `${actualBasename}`)
  childProcess.execFileSync(
    'pdftocairo',
    ['-png', actualPath, `${outputBasename}-actual`],
    { stdio: 'pipe' },
  )
  childProcess.execFileSync(
    'pdftocairo',
    ['-png', referencePath, `${outputBasename}-reference`],
    { stdio: 'pipe' },
  )

  let pixels = 0
  const tmpFiles = [actualPath]

  const currentFilenameRegexp = new RegExp(
    `${actualBasename}-(?:actual|reference)-(\\d+).png`,
  )
  const files = fs.readdirSync(imagesOutputDir)
  const indexes = new Set(
    files
      .filter((name) => name.match(currentFilenameRegexp))
      .map((name) => name.match(currentFilenameRegexp)[1]),
  )
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
    if (
      referencePageExists &&
      actualPageExists &&
      referenceBuffer.compare(actualBuffer) === 0
    ) {
      continue
    }
    pixels += computeImageDifferences(
      referenceBuffer,
      actualBuffer,
      `${outputBasename}-diff-${idx}.png`,
    )
  }
  if (pixels > 0) {
    if (typeof process.env.DEBUG === 'undefined') {
      for (const file of tmpFiles) fs.unlinkSync(file)
    }
  }
  return pixels
}
