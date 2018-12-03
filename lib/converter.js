/* global Opal */
const util = require('util')
const {writeFile, readFile} = require('fs').promises
const path = require('path')
const puppeteer = require('puppeteer')
const asciidoctor = require('asciidoctor.js')()
const getPort = require('get-port')
const handler = require('serve-handler')
const {createServer} = require('http')
const debug = util.debuglog('asciidoctor-pdf')

const STATIC_ASSETS = {
  '/asciidoctor.css': {
    src: path.join(__dirname, '..', 'examples', 'document', 'asciidoctor.css'),
    type: 'text/css',
  },
  '/asciidoctor-document.css': {
    src: path.join(__dirname, '..', 'examples', 'document', 'document.css'),
    type: 'text/css',
  },
  '/paged.polyfill.js': {
    src: require.resolve('pagedjs/dist/paged.polyfill.js'),
    type: 'application/javascript',
  },
}

function registerTemplateConverter (templates) {
  const HTML5Converter = Opal.const_get_qualified(
    Opal.const_get_qualified(
      Opal.const_get_relative(Opal, 'Asciidoctor'),
      'Converter'
    ),
    'Html5Converter'
  )
  class TemplateConverter {
    constructor () {
      this.baseConverter = HTML5Converter.$new()
      this.templates = templates;
    }

    $convert (node, transform, opts) {
      const template = this.templates[transform || node.node_name]
      if (template) {
        return template(node)
      }
      return this.baseConverter.$convert(node, transform, opts)
    }
  }
  asciidoctor.Converter.Factory.$register(new TemplateConverter(), ['html5'])
}

async function convert(inputFile, options, timings) {
  let html;
  let doc;
  if (timings) {
    const timings = asciidoctor.Timings.$new()
    const instanceOptions = Object.assign({}, options, { timings: timings })
    doc = asciidoctor.loadFile(inputFile, instanceOptions)
    html = doc.convert(instanceOptions)
    timings.$print_report(Opal.gvars.stderr, inputFile)
  } else {
    doc = asciidoctor.loadFile(inputFile, options)
    html = doc.convert(options)
  }
  const workingDir = path.dirname(inputFile)
  const inputFilename = path.basename(inputFile)
  const inputFilenameWithoutExt = path.basename(inputFile, path.extname(inputFile))
  const outputFile = path.join(workingDir, inputFilenameWithoutExt + '.pdf')
  const tempFilename = inputFilenameWithoutExt + '_temp.html'

  debug('workingDir', workingDir);
  debug('inputFilename', inputFilename);
  debug('inputFilenameWithoutExt', inputFilenameWithoutExt);
  debug('outputFile', outputFile);
  debug('tempFilename', tempFilename);

  let tempFile;
  if (path.isAbsolute(workingDir)) {
    tempFile = path.join(workingDir, tempFilename)
  } else {
    tempFile = path.normalize(path.join(process.cwd(), workingDir, tempFilename))
  }

  debug('tempFile', tempFile);

  const puppeteerConfig = {
    headless: true,
    args: ['--no-sandbox'],
  }
  const browser = await puppeteer.launch(puppeteerConfig);
  const page = await browser.newPage()
  // page.setDefaultNavigationTimeout(90000)

  page.on('pageerror', function (err) {
    console.error('Page error: ' + err.toString())
  })

  const [, port] = await Promise.all([
    writeFile(tempFile, html),
    getPort(),
  ])

  const url = `http://localhost:${port}/${tempFilename}`;
  const httpOptions = {
    public: workingDir,
    cleanUrls: false,
  };

  return await new Promise((resolve, reject) => {
    debug(`start server on localhost:${port}`)

    const server = createServer(async (req, res) => {
      if (req.url in STATIC_ASSETS) {
        const asset = STATIC_ASSETS[req.url];
        res.writeHead(200, {
          'Content-Type': asset.type,
        })
        return res.end(await readFile(asset.src, {encoding: 'utf8'}))
      }
      else {
        return handler(req, res, httpOptions)
      }
    })
      .listen(port, async () => {
        browser.on('error', reject)
        server.on('error', reject)
        page.on('error', reject)

        try {
          debug(`goto ${url}`)
          await page.goto(url, {waitUntil: 'networkidle2'})
        }
        catch (error) {
          return server.close()
          reject(error)
        }

        const pdfOptions = {
          path: outputFile,
          printBackground: true,
          preferCSSPageSize: true,
        }
        let pdfWidth = doc.getAttributes()['pdf-width']
        if (pdfWidth) {
          pdfOptions.width = pdfWidth
        }
        let pdfHeight = doc.getAttributes()['pdf-height']
        if (pdfHeight) {
          pdfOptions.height = pdfHeight
        }
        let pdfSize = doc.getAttributes()['pdf-size']
        if (pdfSize) {
          pdfOptions.size = pdfSize
        }

        debug(`print pdf ${url}`)
        const output = await page.pdf(pdfOptions)
        server.close()
        resolve(output)
      })
  })
}

function getCoreVersion() {
  return asciidoctor.getCoreVersion()
}

module.exports = {
  convert: convert,
  getCoreVersion: getCoreVersion,
  registerTemplateConverter: registerTemplateConverter
}
