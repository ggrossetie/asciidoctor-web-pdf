const ospath = require('path')
const puppeteer = require('puppeteer')

const BLANK_PAGE_URL = 'about:blank'
const isPkg = typeof process.pkg !== 'undefined'

const consoleLog = (msg) => {
  const type = msg.type()
  if (type === 'error') {
    const location = msg.location()
    let text = msg.text()
    if (location && location.url) {
      text = `${text} at ${location.url}:${location.lineNumber || 1}`
    }
    console.error(text)
  } else {
    console.log(msg.text())
  }
}

const getPuppeteerExecutablePath = function () {
  // use PUPPETEER_EXECUTABLE_PATH environment variable if explicitly defined
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH
  }
  if (isPkg) {
    // when creating binaries with pkg, we use bundled chromium instances stored in the "chromium" directory.
    // otherwise, chromium is installed as part of the puppeteer package in "node_modules/puppeteer/.local-chromium".
    // executable path depending on the operating system:
    // Windows: D:\path\to\node_modules\puppeteer\.local-chromium\win64-818858\chrome-win\chrome.exe
    // Linux: /path/to/node_modules/puppeteer/.local-chromium/linux-818858/chrome-linux/chrome
    const parts = puppeteer.executablePath().split(ospath.sep)
    // keep the parts after the ".local-chromium" directory:
    // Windows: win64-818858\chrome-win\chrome.exe
    // Linux: linux-818858/chrome-linux/chrome
    const partialPath = parts.splice(parts.indexOf('.local-chromium') + 1, parts.length)
    return ospath.join(ospath.dirname(process.execPath), 'chromium', ...partialPath)
  }
  return puppeteer.executablePath()
}
const chromiumExecutablePath = getPuppeteerExecutablePath()

class Browser {
  constructor () {
    const puppeteerDefaultTimeout = process.env.PUPPETEER_DEFAULT_TIMEOUT
    this.navigationTimeout = process.env.PUPPETEER_NAVIGATION_TIMEOUT || puppeteerDefaultTimeout || 30000
    this.renderingTimeout = process.env.PUPPETEER_RENDERING_TIMEOUT || puppeteerDefaultTimeout || 30000
  }

  async goto (url, preview) {
    // check that we have an active browser
    if (!this.underlyingBrowser || !this.underlyingBrowser.isConnected()) {
      await this._launch(preview)
    }
    const gotoPageUrl = new URL(url)
    const browser = this.underlyingBrowser
    const pages = await browser.pages()
    const activePage = await this._getActivePage(pages, gotoPageUrl, preview)
    let page
    let activePageUrl
    const options = { waitUntil: 'networkidle0', timeout: this.navigationTimeout }
    if (activePage) {
      page = activePage
      activePageUrl = new URL(activePage.url())
      if (activePage.url() === BLANK_PAGE_URL) {
        await page.goto(url, options)
      } else {
        await page.reload(options)
      }
    } else {
      page = await browser.newPage()
      this._addPageEventListeners(page, preview)
      await page.goto(url, options)
    }
    // watchdog
    await page.waitForFunction('window.AsciidoctorPDF === undefined || window.AsciidoctorPDF.status === undefined || window.AsciidoctorPDF.status === "ready"', { timeout: this.renderingTimeout })
    // scroll to element
    if (activePageUrl && activePageUrl.hash) {
      await page.evaluate(id => {
        const scrollToElement = document.getElementById(id)
        if (scrollToElement) {
          scrollToElement.scrollIntoView()
        }
      }, activePageUrl.hash.substr(1))
    }
    return page
  }

  async close () {
    if (this.underlyingBrowser) {
      try {
        await this.underlyingBrowser.close()
      } catch (err) {
        console.log('Unable to close the browser - Error: ' + err.toString())
      }
    }
  }

  // private

  async _getActivePage (pages, gotoPageUrl, preview) {
    if (pages && pages.length > 0) {
      const firstPage = pages[0]
      let blankPage
      if (firstPage.url() === BLANK_PAGE_URL) {
        blankPage = firstPage
      }
      let activePage
      for (const page of pages) {
        const currentPageUrl = new URL(page.url())
        if (gotoPageUrl.protocol === currentPageUrl.protocol && gotoPageUrl.pathname === currentPageUrl.pathname) {
          activePage = page
          break
        }
      }
      if (activePage) {
        return activePage
      }
      if (blankPage) {
        this._addPageEventListeners(blankPage, preview)
        return blankPage
      }
    }
    return undefined
  }

  async _addPageEventListeners (page, preview) {
    page
      .on('pageerror', err => {
        console.error('> An uncaught exception happened within the HTML page: ' + err.toString())
        console.log('')
        console.log('TIP: You can add the --preview option to open the HTML page in a non-headless browser and debug it using the Developer Tools.')
      })
      .on('error', err => {
        console.error('Page crashed: ' + err.toString())
      })
    if (!preview) {
      // capture console output
      page.on('console', msg => consoleLog(msg))
    }
  }

  async _launch (preview) {
    const puppeteerConfig = {
      executablePath: chromiumExecutablePath,
      headless: !preview,
      // --no-sandbox:: Disables the sandbox for all process types that are normally sandboxed.
      // --allow-file-access-from-files:: Allows file:// URIs to read other file:// URIs.
      // --export-tagged-pdf:: Generates a tagged (accessible) file when printing to PDF. The plan is for this to go away once tagged PDFs become the default. See https://crbug.com/607777.
      // Reference: https://peter.sh/experiments/chromium-command-line-switches/
      args: ['--no-sandbox', '--allow-file-access-from-files', '--export-tagged-pdf']
    }
    if (preview) {
      Object.assign(puppeteerConfig, { defaultViewport: null })
    }
    this.underlyingBrowser = await puppeteer.launch(puppeteerConfig)
  }
}

module.exports = Browser
