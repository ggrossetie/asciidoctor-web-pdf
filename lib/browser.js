import { createRequire } from 'node:module'
import ospath from 'node:path'
import puppeteer from 'puppeteer'

const require = createRequire(import.meta.url)

const BLANK_PAGE_URL = 'about:blank'
const isSea = (() => {
  try {
    return require('node:sea').isSea()
  } catch {
    return false
  }
})()

const consoleLog = (msg) => {
  const type = msg.type()
  if (type === 'error') {
    const location = msg.location()
    let text = msg.text()
    if (location?.url) {
      text = `${text} at ${location.url}:${location.lineNumber || 1}`
    }
    console.error(text)
  } else {
    console.log(msg.text())
  }
}

const getPuppeteerExecutablePath = () => {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH
  }
  if (isSea) {
    // In SEA binaries, puppeteer.executablePath() cannot be used because its internal
    // path is baked to the build machine. Use @puppeteer/browsers to compute the path
    // relative to the binary instead.
    const {
      computeExecutablePath,
      detectBrowserPlatform,
      Browser,
    } = require('@puppeteer/browsers')
    const {
      PUPPETEER_REVISIONS,
    } = require('puppeteer-core/lib/puppeteer/revisions.js')
    const buildId = PUPPETEER_REVISIONS.chrome
    return computeExecutablePath({
      browser: Browser.CHROME,
      buildId,
      cacheDir: ospath.join(ospath.dirname(process.execPath), 'chromium'),
      platform: detectBrowserPlatform(),
    })
  }
  return puppeteer.executablePath()
}
const chromiumExecutablePath = getPuppeteerExecutablePath()

export default class Browser {
  constructor() {
    const puppeteerDefaultTimeout = process.env.PUPPETEER_DEFAULT_TIMEOUT
    this.navigationTimeout =
      process.env.PUPPETEER_NAVIGATION_TIMEOUT ||
      puppeteerDefaultTimeout ||
      30000
    this.renderingTimeout =
      process.env.PUPPETEER_RENDERING_TIMEOUT ||
      puppeteerDefaultTimeout ||
      30000
  }

  async goto(url, preview, verbose) {
    // check that we have an active browser
    if (!this.underlyingBrowser?.connected) {
      await this._launch(preview)
    }
    const gotoPageUrl = new URL(url)
    const browser = this.underlyingBrowser
    const pages = await browser.pages()
    const activePage = await this._getActivePage(pages, gotoPageUrl, preview)
    let page
    let activePageUrl
    const options = {
      waitUntil: 'networkidle0',
      timeout: this.navigationTimeout,
    }
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
      this._addPageEventListeners(page, preview, verbose)
      await page.goto(url, options)
    }
    // watchdog
    await page.waitForFunction(
      'document.body.getAttribute("data-vivliostyle-viewer-status") === "complete"',
      { timeout: this.renderingTimeout },
    )
    // scroll to element
    if (activePageUrl?.hash) {
      await page.evaluate((id) => {
        const scrollToElement = document.getElementById(id)
        if (scrollToElement) {
          scrollToElement.scrollIntoView()
        }
      }, activePageUrl.hash.substr(1))
    }
    return page
  }

  async preprocessScripts(url, waitFor, verbose) {
    if (!this.underlyingBrowser?.connected) {
      await this._launch(false)
    }
    const page = await this.underlyingBrowser.newPage()
    this._addPageEventListeners(page, false, verbose)
    await page.goto(url, { waitUntil: 'networkidle0', timeout: this.navigationTimeout })
    if (typeof waitFor === 'string') {
      await page.waitForFunction(waitFor, { timeout: this.navigationTimeout })
    }
    const html = await page.content()
    await page.close()
    return html
  }

  async close() {
    if (this.underlyingBrowser) {
      try {
        await this.underlyingBrowser.close()
      } catch (err) {
        console.log(`Unable to close the browser - Error: ${err.toString()}`)
      }
    }
  }

  // private

  async _getActivePage(pages, gotoPageUrl, preview) {
    if (pages && pages.length > 0) {
      const firstPage = pages[0]
      let blankPage
      if (firstPage.url() === BLANK_PAGE_URL) {
        blankPage = firstPage
      }
      let activePage
      for (const page of pages) {
        const currentPageUrl = new URL(page.url())
        if (
          gotoPageUrl.protocol === currentPageUrl.protocol &&
          gotoPageUrl.pathname === currentPageUrl.pathname
        ) {
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

  async _addPageEventListeners(page, preview, verbose) {
    page
      .on('pageerror', (err) => {
        console.error(
          '> An uncaught exception happened within the HTML page: ' +
            err.toString(),
        )
        console.log('')
        console.log(
          'TIP: You can add the --preview option to open the HTML page in a non-headless browser and debug it using the Developer Tools.',
        )
      })
      .on('error', (err) => {
        console.error(`Page crashed: ${err.toString()}`)
      })
    if (!preview && verbose) {
      page.on('console', (msg) => consoleLog(msg))
    }
  }

  async _launch(preview) {
    const puppeteerConfig = {
      executablePath: await Promise.resolve(chromiumExecutablePath),
      headless: !preview,
      args: [
        '--no-sandbox',
        '--allow-file-access-from-files',
        '--export-tagged-pdf',
      ],
    }
    if (preview) {
      Object.assign(puppeteerConfig, { defaultViewport: null })
    }
    this.underlyingBrowser = await puppeteer.launch(puppeteerConfig)
  }
}
