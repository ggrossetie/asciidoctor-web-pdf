const path = require('path')
const fs = require('fs')
const fsExtra = require('fs-extra')
const archiver = require('archiver')
const puppeteer = require('puppeteer')
const { execSync, execFileSync } = require('child_process')
const https = require('https')
const esbuild = require('esbuild')

const appName = 'asciidoctor-web-pdf'
const buildDir = 'build'
const rootDirPath = path.join(__dirname, '..')
const buildDirPath = path.join(rootDirPath, buildDir)
const version = require('../package.json').version
const nodeVersion = process.version // e.g., 'v24.15.0'
const nodeMajor = parseInt(nodeVersion.slice(1))

// codesign is required on macOS to remove/add the signature before/after blob injection
const hasCodesign = process.platform === 'darwin'

const platforms = {
  'mac-arm64': {
    nodeArchive: `node-${nodeVersion}-darwin-arm64.tar.gz`,
    nodeBinaryPath: `node-${nodeVersion}-darwin-arm64/bin/node`,
    suffix: '',
    puppeteerPlatform: 'mac_arm',
    isMac: true,
  },
  'linux-arm64': {
    nodeArchive: `node-${nodeVersion}-linux-arm64.tar.gz`,
    nodeBinaryPath: `node-${nodeVersion}-linux-arm64/bin/node`,
    suffix: '',
    // puppeteer v15 does not ship linux-arm64 Chromium; set PUPPETEER_EXECUTABLE_PATH at runtime
    skipChromium: true,
  },
  'linux-x64': {
    nodeArchive: `node-${nodeVersion}-linux-x64.tar.gz`,
    nodeBinaryPath: `node-${nodeVersion}-linux-x64/bin/node`,
    suffix: '',
    puppeteerPlatform: 'linux',
  },
  'win-x64': {
    nodeArchive: `node-${nodeVersion}-win-x64.zip`,
    nodeBinaryPath: `node-${nodeVersion}-win-x64/node.exe`,
    suffix: '.exe',
    puppeteerPlatform: 'win64',
    isWindows: true,
  },
}

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
    external: [
      // Native addon - chokidar falls back to polling without it
      'fsevents',
      // Read as text at runtime via fs.readFileSync; not imported as a module
      '@ggrossetie/pagedjs',
      'mathjax',
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

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    const handleResponse = (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        https.get(response.headers.location, handleResponse).on('error', reject)
        return
      }
      response.pipe(file)
      file.on('finish', () => file.close(resolve))
    }
    https.get(url, handleResponse).on('error', (err) => {
      fs.unlink(dest, () => {})
      reject(err)
    })
  })
}

async function downloadNodeBinary(platformKey, platform) {
  const platformDir = path.join(buildDirPath, platformKey)
  const archivePath = path.join(platformDir, platform.nodeArchive)
  const nodeDistUrl = `https://nodejs.org/dist/${nodeVersion}/${platform.nodeArchive}`

  console.log(`Downloading Node.js ${nodeVersion} for ${platformKey}...`)
  await downloadFile(nodeDistUrl, archivePath)

  console.log(`Extracting Node.js binary for ${platformKey}...`)
  if (platform.isWindows) {
    execSync(
      `unzip -q "${archivePath}" "${platform.nodeBinaryPath}" -d "${platformDir}"`,
    )
  } else {
    execSync(
      `tar -xzf "${archivePath}" -C "${platformDir}" "${platform.nodeBinaryPath}"`,
    )
  }

  const extractedBinaryPath = path.join(
    platformDir,
    ...platform.nodeBinaryPath.split('/'),
  )
  const binaryPath = path.join(platformDir, `${appName}${platform.suffix}`)
  fsExtra.moveSync(extractedBinaryPath, binaryPath)

  // Clean up the downloaded archive and extracted directory skeleton
  fs.unlinkSync(archivePath)
  const extractedTopDir = path.join(
    platformDir,
    platform.nodeBinaryPath.split('/')[0],
  )
  if (fs.existsSync(extractedTopDir)) {
    fsExtra.removeSync(extractedTopDir)
  }

  return binaryPath
}

async function injectBlob(platformKey, platform, binaryPath, blobPath) {
  console.log(`Injecting SEA blob into ${platformKey} binary...`)

  if (platform.isMac && hasCodesign) {
    execSync(`codesign --remove-signature "${binaryPath}"`, {
      stdio: 'inherit',
    })
  }

  const postjectBin = path.join(rootDirPath, 'node_modules', '.bin', 'postject')
  const postjectArgs = [
    binaryPath,
    'NODE_SEA_BLOB',
    blobPath,
    '--sentinel-fuse',
    'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
  ]
  if (platform.isMac) {
    postjectArgs.push('--macho-segment-name', 'NODE_SEA')
  }
  execFileSync(postjectBin, postjectArgs, { stdio: 'inherit' })

  if (platform.isMac && hasCodesign) {
    execSync(`codesign --sign - "${binaryPath}"`, { stdio: 'inherit' })
  }
}

async function getBrowsers(platforms) {
  const platformsWithChromium = Object.entries(platforms).filter(
    ([, p]) => p.puppeteerPlatform && !p.skipChromium,
  )

  if (platformsWithChromium.length === 0) {
    console.log('No Chromium download needed for selected platforms')
    return
  }

  console.log(
    `Downloading Chromium for: ${platformsWithChromium.map(([k]) => k).join(', ')}...`,
  )

  await Promise.all(
    platformsWithChromium.map(async ([name, platform]) => {
      return puppeteer
        .createBrowserFetcher({
          platform: platform.puppeteerPlatform,
          path: path.resolve(path.join(buildDirPath, name, 'chromium')),
        })
        .download(puppeteer.default._preferredRevision)
    }),
  )
}

function copyAssets(platforms) {
  for (const [name] of Object.entries(platforms)) {
    console.log(`Copying assets into ${name}...`)
    const outDir = path.join(buildDirPath, name)

    // MathJax: must be file-accessible from Chromium (not bundled into the binary)
    const mathjaxOutDir = path.join(outDir, 'assets', 'mathjax')
    fsExtra.ensureDirSync(mathjaxOutDir)
    const mathjaxSrcDir = path.dirname(
      require.resolve('mathjax/es5/tex-chtml-full.js'),
    )
    fsExtra.copySync(mathjaxSrcDir, mathjaxOutDir)

    // Scripts read at runtime and injected inline into the HTML page
    const scriptsOutDir = path.join(outDir, 'scripts')
    fsExtra.ensureDirSync(scriptsOutDir)
    fsExtra.copySync(
      require.resolve('@ggrossetie/pagedjs/dist/paged.polyfill.js'),
      path.join(scriptsOutDir, 'paged.polyfill.js'),
    )
    const libDocDir = path.join(rootDirPath, 'lib', 'document')
    for (const scriptFile of [
      'repeating-table-elements.js',
      'paged-rendering.js',
    ]) {
      fsExtra.copySync(
        path.join(libDocDir, scriptFile),
        path.join(scriptsOutDir, scriptFile),
      )
    }

    // CSS, examples, fonts
    for (const dir of ['css', 'examples', 'fonts']) {
      fsExtra.copySync(path.join(rootDirPath, dir), path.join(outDir, dir))
    }
  }
}

async function archive(platforms) {
  console.log('Zipping...')
  await Promise.all(
    Object.keys(platforms).map(async (platform) => {
      const arch = archiver('zip', { zlib: { level: 9 } })
      const archiveName = `${appName}-${platform}`
      const rootFolder = `${archiveName}-v${version}`
      const zipOut = fs.createWriteStream(
        path.join(buildDirPath, `${archiveName}.zip`),
      )
      zipOut.on('close', () => {
        console.log(
          `Wrote ${Math.round(arch.pointer() / 1e4) / 1e2} Mb to ${archiveName}.zip`,
        )
      })
      arch.on('error', (err) => {
        throw err
      })
      arch.pipe(zipOut)
      arch.directory(path.join(buildDirPath, platform), rootFolder)
      await arch.finalize()
    }),
  )
}

async function main(platforms, options) {
  console.log(`Remove ${buildDir} directory`)
  fsExtra.removeSync(buildDirPath)

  console.log('Create directory structure')
  for (const name of Object.keys(platforms)) {
    fsExtra.ensureDirSync(path.join(buildDirPath, name))
  }

  await bundle()

  const seaConfigPath = createSeaConfig()
  createSeaBlob(seaConfigPath)

  const blobPath = path.join(buildDirPath, 'sea-prep.blob')

  for (const [platformKey, platform] of Object.entries(platforms)) {
    const binaryPath = await downloadNodeBinary(platformKey, platform)
    await injectBlob(platformKey, platform, binaryPath, blobPath)
  }

  await getBrowsers(platforms)
  console.log('\nChromium downloaded/available')

  copyAssets(platforms)

  await archive(platforms)

  console.log('Done!')
}

;(async () => {
  try {
    let args = process.argv.slice(2)
    const options = {}
    if (args.includes('--no-progress')) {
      args = args.filter((e) => e !== '--no-progress')
    }
    if (args.length > 0) {
      const platform = args[0]
      if (platform in platforms) {
        await main({ [platform]: platforms[platform] }, options)
      } else {
        console.error(
          `${platform} is not a recognized platform. Use one of: ${Object.keys(platforms).join(', ')}`,
        )
        process.exit(1)
      }
    } else {
      await main(platforms, options)
    }
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
})()
