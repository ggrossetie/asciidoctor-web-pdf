const path = require('path')
const fs = require('fs')

const { exec } = require('pkg')
const puppeteer = require('puppeteer')


const app_name = 'asciidoctor-web-pdf'

const builds = {
    linux: { target: 'node10-linux-x64' },
    mac: { target: 'node10-macos-x64' },
    win: { target: 'node10-macos-x64', suffix: '.exe', puppeteerName: 'win64' }
}

async function package(builds) {
    for (const os in builds) {
        console.log(`Building ${app_name} for: ${os}`)
        await exec(['.', '--target', builds[os].target, '--output', `./dist/${os}/${app_name}${builds[os].suffix || ''}`])
    }
}

async function getBrowsers(builds) {
    const targets = Object.keys(builds).map((key) => [key, builds[key].puppeteerName || key])
    await targets.forEach(async([dir, os]) => {
        const f = puppeteer.createBrowserFetcher({
            platform: os,
            path: path.resolve(path.join('__dirname', '../', "dist", dir, "chromium")),
        })
        await f.download(puppeteer._preferredRevision, function(downloadBytes, totalBytes) {
            let occasionally = Math.random()
            if (occasionally < 0.0005) {
                process.stdout.cursorTo(0);
                let percent = Math.round(downloadBytes / totalBytes * 100, 0)
                process.stdout.write(`Downloading browser for ${os.padEnd(10)} ${percent.toString().padStart(5)}%`)
            }
        }).then(() => {
            console.log(`Browser downloaded/available for ${os}`)
        })
    })
}

async function main(builds) {
    const build_path = 'dist'
    !fs.existsSync(build_path) && fs.mkdirSync(build_path)
    const dirs = Object.keys(builds).map((key) => key)

    dirs.forEach(async(dir) => {
        let out_dir = path.join('__dirname', '../', 'dist', dir) 
        !fs.existsSync(out_dir) && fs.mkdirSync(out_dir)
        
        let chromium_dir = path.join(out_dir,'chromium')
        !fs.existsSync(chromium_dir) && fs.mkdirSync(chromium_dir)
    })

    await getBrowsers(builds)

    package(builds)

}

main(builds)