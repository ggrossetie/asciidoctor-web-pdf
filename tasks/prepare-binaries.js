import { execFileSync, execSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { Browser, detectBrowserPlatform, install } from '@puppeteer/browsers'
import esbuild from 'esbuild'
import fsExtra from 'fs-extra'

const require = createRequire(import.meta.url)
const archiver = require('archiver')

const appName = 'asciidoctor-web-pdf'
const buildDir = 'build'
const rootDirPath = path.join(import.meta.dirname, '..')
const buildDirPath = path.join(rootDirPath, buildDir)
const version = require('../package.json').version
const nodeMajor = parseInt(process.version.slice(1), 10)

const isWindows = process.platform === 'win32'
const isMac = process.platform === 'darwin'
const suffix = isWindows ? '.exe' : ''

function getPlatformKey() {
  const { platform, arch } = process
  if (platform === 'darwin' && arch === 'arm64') return 'mac-arm64'
  if (platform === 'linux' && arch === 'x64') return 'linux-x64'
  if (platform === 'linux' && arch === 'arm64') return 'linux-arm64'
  if (platform === 'win32' && arch === 'x64') return 'win-x64'
  throw new Error(`Unsupported platform: ${platform}/${arch}`)
}

const platformKey = getPlatformKey()

// Chrome does not ship a linux-arm64 build via @puppeteer/browsers; set PUPPETEER_EXECUTABLE_PATH at runtime
const isLinuxArm = process.platform === 'linux' && process.arch === 'arm64'

async function bundle() {
  console.log('Bundling application with esbuild...')
  const bundlePath = path.join(buildDirPath, 'bundle.js')
  await esbuild.build({
    entryPoints: [path.join(rootDirPath, 'bin', appName)],
    bundle: true,
    platform: 'node',
    target: [`node${nodeMajor}`],
    outfile: bundlePath,
    loader: { '': 'js' },
    define: {
      'import.meta.url': '__filename',
      'import.meta.dirname': '__dirname',
    },
    external: [
      // Native addon - chokidar falls back to polling without it
      'fsevents',
    ],
  })
  // Remove the top-level "use strict" that esbuild propagates from entry files.
  // Opal's method aliasing assigns to alias.length which is non-writable in strict mode.
  // In sloppy mode the assignment silently fails, which is acceptable.
  let content = fs.readFileSync(bundlePath, 'utf8')
  content = content.replace(/^(#!.*\n)"use strict";\n/, '$1')
  fs.writeFileSync(bundlePath, content)
}

function createSeaConfig() {
  const seaConfig = {
    main: path.join(buildDirPath, 'bundle.js'),
    output: path.join(buildDirPath, 'sea-prep.blob'),
    disableExperimentalSEAWarning: true,
  }
  const configPath = path.join(buildDirPath, 'sea-config.json')
  fs.writeFileSync(configPath, JSON.stringify(seaConfig, null, 2))
  return configPath
}

function createSeaBlob(configPath) {
  console.log('Creating SEA blob...')
  execSync(`node --experimental-sea-config "${configPath}"`, {
    stdio: 'inherit',
  })
}

function buildBinary() {
  const platformDir = path.join(buildDirPath, platformKey)
  const binaryPath = path.join(platformDir, `${appName}${suffix}`)
  const blobPath = path.join(buildDirPath, 'sea-prep.blob')

  console.log('Copying Node.js binary...')
  fsExtra.copySync(process.execPath, binaryPath)
  if (!isWindows) {
    fs.chmodSync(binaryPath, 0o755)
  }

  if (isMac) {
    execSync(`codesign --remove-signature "${binaryPath}"`, {
      stdio: 'inherit',
    })
  }

  console.log('Injecting SEA blob...')
  const postjectBin = path.join(
    rootDirPath,
    'node_modules',
    '.bin',
    isWindows ? 'postject.cmd' : 'postject',
  )
  const postjectArgs = [
    binaryPath,
    'NODE_SEA_BLOB',
    blobPath,
    '--sentinel-fuse',
    'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
  ]
  if (isMac) {
    postjectArgs.push('--macho-segment-name', 'NODE_SEA')
  }
  execFileSync(postjectBin, postjectArgs, {
    stdio: 'inherit',
    shell: isWindows,
  })

  if (isMac) {
    execSync(`codesign --sign - "${binaryPath}"`, { stdio: 'inherit' })
  }

  return binaryPath
}

async function getBrowser() {
  if (isLinuxArm) {
    console.log('Skipping Chrome download (not supported on linux-arm64)')
    return
  }

  const {
    PUPPETEER_REVISIONS,
  } = require('puppeteer-core/lib/puppeteer/revisions.js')
  const buildId = PUPPETEER_REVISIONS.chrome
  console.log(`Downloading Chrome ${buildId} for ${platformKey}...`)
  await install({
    browser: Browser.CHROME,
    buildId,
    cacheDir: path.join(buildDirPath, platformKey, 'chromium'),
    platform: detectBrowserPlatform(),
  })
}

function copyAssets() {
  console.log('Copying assets...')
  const outDir = path.join(buildDirPath, platformKey)

  // MathJax fonts: must be file-accessible from Chromium for CHTML rendering
  const mathjaxFontsOutDir = path.join(outDir, 'assets', 'mathjax-fonts')
  fsExtra.ensureDirSync(mathjaxFontsOutDir)
  const mathjaxFontsSrcDir = path.join(
    path.dirname(require.resolve('@mathjax/mathjax-newcm-font/package.json')),
    'chtml',
    'woff2',
  )
  fsExtra.copySync(mathjaxFontsSrcDir, mathjaxFontsOutDir)

  // Vivliostyle viewer: HTML + JS + CSS served via file:// for headless rendering
  const viewerOutDir = path.join(outDir, 'viewer')
  fsExtra.ensureDirSync(viewerOutDir)
  const viewerPkgDir = path.dirname(require.resolve('@vivliostyle/viewer/package.json'))
  fsExtra.copySync(path.join(viewerPkgDir, 'lib'), viewerOutDir)

  // CSS, examples, fonts
  for (const dir of ['css', 'examples', 'fonts']) {
    fsExtra.copySync(path.join(rootDirPath, dir), path.join(outDir, dir))
  }
}

function smokeTest() {
  if (isLinuxArm) {
    console.log('Skipping smoke test (no bundled Chrome on linux-arm64)')
    return
  }

  console.log('Running smoke test...')
  const platformDir = path.join(buildDirPath, platformKey)
  const binaryPath = path.join(platformDir, `${appName}${suffix}`)
  const inputDoc = path.join(
    platformDir,
    'examples',
    'document',
    'basic-example.adoc',
  )
  const outputPdf = path.join(platformDir, 'smoke-test.pdf')

  execFileSync(binaryPath, [inputDoc, '-o', outputPdf], { stdio: 'inherit' })

  if (!fs.existsSync(outputPdf) || fs.statSync(outputPdf).size === 0) {
    throw new Error('Smoke test failed: PDF was not generated or is empty')
  }

  fs.unlinkSync(outputPdf)
  console.log('Smoke test passed!')
}

async function archive() {
  console.log('Zipping...')
  const archiveName = `${appName}-${platformKey}`
  const rootFolder = `${archiveName}-v${version}`
  const zipPath = path.join(buildDirPath, `${archiveName}.zip`)

  await new Promise((resolve, reject) => {
    const arch = new archiver.ZipArchive({ zlib: { level: 9 } })
    const zipOut = fs.createWriteStream(zipPath)
    zipOut.on('close', () => {
      console.log(
        `Wrote ${Math.round(arch.pointer() / 1e4) / 1e2} Mb to ${archiveName}.zip`,
      )
      resolve()
    })
    arch.on('error', reject)
    arch.pipe(zipOut)
    arch.directory(path.join(buildDirPath, platformKey), rootFolder)
    arch.finalize()
  })
}

async function main() {
  console.log(`Building for ${platformKey}...`)
  fsExtra.removeSync(buildDirPath)
  fsExtra.ensureDirSync(path.join(buildDirPath, platformKey))

  await bundle()

  const seaConfigPath = createSeaConfig()
  createSeaBlob(seaConfigPath)

  buildBinary()
  await getBrowser()
  copyAssets()
  smokeTest()
  await archive()

  console.log('Done!')
}

try {
  await main()
} catch (err) {
  console.error(err)
  process.exit(1)
}
