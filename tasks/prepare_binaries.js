const path = require('path')
const fs = require('fs')
const fsExtra = require('fs-extra')

const archiver = require('archiver')
const { exec } = require('pkg')
const puppeteer = require('puppeteer')

const appName = 'asciidoctor-web-pdf'
const buildDir = 'build'

// Gets chromium browser and builds binaries using pkg
// Can specify linux/mac/win as first argument to only build one of these platforms
// NOTE: Intended to be run from the _project root only_

const builds = {
  linux: { target: 'node12-linux-x64' },
  mac: { target: 'node12-macos-x64' },
  win: { target: 'node12-macos-x64', suffix: '.exe', puppeteerName: 'win64' }
}

async function createPackage (builds) {
  for (const os in builds) {
    console.log(`Building ${appName} for: ${os}`)
    await exec([`bin/${appName}`, '--config', 'package.json', '--target', builds[os].target, '--output', `./${buildDir}/${os}/${appName}${builds[os].suffix || ''}`])
  }
}

async function getBrowsers (builds) {
  const targets = Object.keys(builds).map((key) => [key, builds[key].puppeteerName || key])
  await Promise.all(targets.map(async ([dir, os]) => {
    const f = puppeteer.createBrowserFetcher({
      platform: os,
      path: path.resolve(path.join('__dirname', '../', buildDir, dir, 'chromium'))
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
  }))
}

function copyAssets (builds) {
  const dirs = Object.keys(builds).map((key) => key)
  dirs.forEach(async (dir) => {
    console.log(`Copying MathJax / examples / css / fonts into ${dir}`)
    const basePath = path.join(__dirname, '../')
    const outDir = path.join(basePath, buildDir, dir)
    // MathJax cannot be embedded in the binary because it has to be accessed in Chromium
    // which does not have access to the pkg snapshotted filesystem
    const mathjaxBinaryDir = path.join(outDir, 'assets', 'mathjax')
    // also creates folder structure
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

async function archive (builds) {
  console.log('Zipping...')
  const dirs = Object.keys(builds).map((key) => key)
  await dirs.forEach(async (dir) => {
    const buildPath = path.join('__dirname', '../', buildDir)

    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximize compression
    })
    // must not be in same dir where we are zipping
    const zipOut = fs.createWriteStream(path.join(buildPath, `${appName}-${dir}.zip`))

    zipOut.on('close', function () {
      console.log(`Wrote ${Math.round(archive.pointer() / 1e4) / 1e2} Mb total to ${dir}`)
    })

    archive.on('error', function (err) {
      throw err
    })
    // pipe archive to file stream
    archive.pipe(zipOut)
    // recursively add directory to _root_ of zip
    archive.directory(path.join(buildPath, dir), false)
    archive.finalize()
  })
}

async function main (builds) {
  // remove existing build dir
  console.log(`Remove ${buildDir} dir`)
  fsExtra.removeSync(path.join('__dirname', '../', buildDir))

  // create dir structure for builds and browser download
  console.log('Create dir structure')
  const dirs = Object.keys(builds).map((key) => key)
  await dirs.forEach(async (dir) => {
    const chromiumDir = path.join('__dirname', '../', buildDir, dir, 'chromium')
    fsExtra.ensureDirSync(chromiumDir)
  })

  // get browser
  await getBrowsers(builds)

  // using pkg create the binary for asciidoctor-web-pdf
  await createPackage(builds)

  // copy MathJax and the css/examples/fonts folders
  copyAssets(builds)

  await archive(builds)
}

// allow invoking `node tasks/prepare_binaries.js` with win/linux/macos as the argument
// e.g. `npm run build linux`
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
