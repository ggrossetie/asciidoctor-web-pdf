const path = require('path')
const fs = require('fs')
const fsExtra = require('fs-extra')
const archiver = require('archiver')
const { exec } = require('pkg')
const puppeteer = require('puppeteer')

const appName = 'asciidoctor-web-pdf'
const buildDir = 'build'
const buildDirPath = path.join(__dirname, '..', buildDir)

// Gets chromium browser and builds binaries using pkg
// Can specify linux/mac/win as first argument to only build one of these platforms

const platforms = {
  linux: { target: 'node12-linux-x64' },
  mac: { target: 'node12-macos-x64' },
  win: { target: 'node12-win-x64', suffix: '.exe', puppeteerPlatform: 'win64' }
}

const version = require('../package.json').version

async function createPackage (platforms) {
  for (const [name, platform] of Object.entries(platforms)) {
    console.log(`Building ${appName} for: ${name}`)
    await exec([`bin/${appName}`, '--config', 'package.json', '--target', platform.target, '--output', `./${buildDir}/${name}/${appName}${platform.suffix || ''}`])
  }
}

async function getBrowsers (platforms) {
  console.log('\n')
  const downloadProgress = Object.assign({}, ...Object.keys(platforms).map((key) => ({ [key]: 0 })))
  return Promise.all(Object.entries(platforms).map(async ([name, platform], index) => {
    const puppeteerPlatform = platform.puppeteerPlatform || name
    return puppeteer
      .createBrowserFetcher({
        platform: puppeteerPlatform, // one of: linux, mac, win32 or win64
        path: path.resolve(path.join(buildDirPath, name, 'chromium'))
      })
      .download(puppeteer._preferredRevision, function (downloadBytes, totalBytes) {
        downloadProgress[name] = Math.round(downloadBytes / totalBytes * 100)
        const entries = Object.entries(downloadProgress)
        const status = `Downloading ${entries.length > 1 ? 'browsers' : 'browser'} [${entries.map(([name, percent]) => `${name}: ${percent.toString().padStart(2)}%`).join(', ')}]`
        console.log('\x1B[1A\x1B[K' + status)
      })
  }))
}

function copyAssets (platforms) {
  for (const platform of Object.keys(platforms)) {
    console.log(`Copying MathJax / examples / css / fonts into ${platform}`)
    const outDir = path.join(buildDirPath, platform)
    // MathJax cannot be embedded in the binary because it has to be accessed in Chromium
    // which does not have access to the pkg snapshotted filesystem
    const mathjaxBinaryDir = path.join(outDir, 'assets', 'mathjax')
    // also creates folder structure
    fsExtra.ensureDirSync(mathjaxBinaryDir)

    // done like this to make it more "findable"
    const mathjaxDir = path.dirname(require.resolve('mathjax/es5/tex-chtml-full.js'))
    fsExtra.copySync(mathjaxDir, mathjaxBinaryDir)

    const copyDirs = ['css', 'examples', 'fonts']
    for (const copyDir of copyDirs) {
      fsExtra.copySync(path.join(__dirname, '..', copyDir), path.join(outDir, copyDir))
    }
  }
}

async function archive (platforms) {
  console.log('Zipping...')
  await Promise.all(Object.keys(platforms).map(async (platform) => {
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximize compression
    })
    const archiveName = `${appName}-${platform}`
    const rootFolder = `${archiveName}-v${version}`
    // must not be in same dir where we are zipping
    const zipOut = fs.createWriteStream(path.join(buildDirPath, `${archiveName}.zip`))
    zipOut.on('close', function () {
      console.log(`Wrote ${Math.round(archive.pointer() / 1e4) / 1e2} Mb total to ${platform}`)
    })
    archive.on('error', function (err) {
      throw err
    })
    // pipe archive to file stream
    archive.pipe(zipOut)
    // recursively add directory to folder ${archiveName}-${version}
    archive.directory(path.join(buildDirPath, platform), rootFolder, {})
    await archive.finalize()
  }))
}

async function main (platforms) {
  // remove existing build dir
  console.log(`Remove ${buildDir} directory`)
  fsExtra.removeSync(buildDirPath)

  // create dir structure for builds and browser download
  console.log('Create directory structure')
  for (const platform of Object.keys(platforms)) {
    const chromiumDir = path.join(buildDirPath, platform, 'chromium')
    fsExtra.ensureDirSync(chromiumDir)
  }

  // get browser
  await getBrowsers(platforms)
  console.log('\nBrowsers are downloaded/available')

  // using pkg create the binary for asciidoctor-web-pdf
  await createPackage(platforms)

  // copy MathJax and the css/examples/fonts folders
  copyAssets(platforms)

  await archive(platforms)
}

// allow invoking `node tasks/prepare-binaries.js` with linux/mac/win as the argument
// e.g. `npm run build linux`
;(async () => {
  try {
    if (process.argv.length > 2) {
      const platform = process.argv[2]
      if (platform in platforms) {
        const singleBuild = {}
        singleBuild[platform] = platforms[platform]
        await main(singleBuild)
      } else {
        console.error(`${platform} is not a recognized platform, please use one of: ${Object.keys(platforms)}`)
      }
    } else {
      await main(platforms)
    }
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
})()
