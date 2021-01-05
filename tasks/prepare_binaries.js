const path = require('path')
const fsExtra = require('fs-extra')

const { exec } = require('pkg')
const puppeteer = require('puppeteer')

const appName = 'asciidoctor-web-pdf'
const buildPath = 'build'

// Gets chromium browser and builds binaries using pkg
// Can specify linux/mac/win as first argument to only build one of these platforms
// NOTE: Intended to be run from the _project root only_

const builds = {
  linux: { target: 'node10-linux-x64' },
  mac: { target: 'node10-macos-x64' },
  win: { target: 'node10-macos-x64', suffix: '.exe', puppeteerName: 'win64' }
}

async function createPackage (builds) {
  for (const os in builds) {
    console.log(`Building ${appName} for: ${os}`)
    await exec(['.', '--target', builds[os].target, '--output', `./${buildPath}/${os}/${appName}${builds[os].suffix || ''}`])
  }
}

async function getBrowsers (builds) {
  const targets = Object.keys(builds).map((key) => [key, builds[key].puppeteerName || key])
  await targets.forEach(async ([dir, os]) => {
    const f = puppeteer.createBrowserFetcher({
      platform: os,
      path: path.resolve(path.join('__dirname', '../', buildPath, dir, 'chromium'))
    })
    await f.download(puppeteer._preferredRevision, function (downloadBytes, totalBytes) {
      // a hacky way to show progress occasionally
      const occasionally = Math.random()
      if (occasionally < 0.0005) {
        process.stdout.cursorTo(0)
        const percent = Math.round(downloadBytes / totalBytes * 100, 0)
        process.stdout.write(`Downloading browser for ${os.padEnd(10)} ${percent.toString().padStart(5)}%`)
      }
    }).then(() => {
      console.log(`Browser downloaded/available for ${os}`)
    })
  })
}

function copyAssets (builds) {
  const dirs = Object.keys(builds).map((key) => key)
  dirs.forEach(async (dir) => {
    console.log(`Copying MathJax / examples / css / fonts into ${dir}`)
    const basePath = path.join(__dirname, '../')
    const outDir = path.join(basePath, buildPath, dir)
    const mathjaxBinaryDir = path.join(outDir, 'assets', 'mathjax')
    // also creates folder structure
    console.log(mathjaxBinaryDir)
    fsExtra.ensureDirSync(mathjaxBinaryDir)

    // done like this to make it more "findable"
    const mathjaxDir = path.dirname(require.resolve('mathjax/es5/tex-chtml-full.js'))
    fsExtra.copySync(mathjaxDir, mathjaxBinaryDir)

    const copyDirs = ['css', 'examples', 'fonts']
    for (const cDir of copyDirs) {
      fsExtra.copySync(path.join(basePath, cDir), path.join(outDir, cDir))
    }
  })
}

async function main (builds) {
  // create dir structure for builds and browser download
  console.log('Create dir structure')
  const dirs = Object.keys(builds).map((key) => key)
  await dirs.forEach(async (dir) => {
    const chromiumDir = path.join('__dirname', '../', buildPath, dir, 'chromium')
    fsExtra.ensureDirSync(chromiumDir)
  })

  // get browser
  await getBrowsers(builds)

  // create package for asciidoctor-web-pdf
  createPackage(builds)

  // copy MathJax and the css/examples/fonts folders
  copyAssets(builds)
}

// allow invoking `node tasks/prepare_binaries.js` with win/linux/macos as the argument
console.log(process.argv)
if (process.argv.length > 2) {
  const platform = process.argv[2]
  if (platform in builds) {
    const singleBuild = {}
    singleBuild[platform] = builds[platform]
    main(singleBuild)
  } else {
    console.log('Not a recognized platform')
  }
} else {
  main(builds)
}
