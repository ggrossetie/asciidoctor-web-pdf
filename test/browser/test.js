/* global it, describe, mocha, chai, asciidoctorProcessor, AsciidoctorPdfDocumentConverter, mochaOpts */
(async () => {
  let reporter
  if (typeof mochaOpts === 'function') {
    reporter = await mochaOpts().reporter
  } else {
    reporter = 'html'
  }
  mocha.setup({
    ui: 'bdd',
    ignoreLeaks: true,
    reporter: reporter
  })

  const expect = chai.expect

  describe('Conversion', () => {
    describe('When extension is registered', () => {
      it('should convert to a "print-ready" HTML page', () => {
        const input = `= Dark and Stormy
Author Name
:doctype: book

body

== Section 1
`

        class CustomDocumentConverter extends AsciidoctorPdfDocumentConverter {
        }
        asciidoctorProcessor.ConverterFactory.register(new CustomDocumentConverter(), ['custom-web-pdf'])
        const doc = asciidoctorProcessor.load(input, { backend: 'custom-web-pdf', standalone: true })
        const html = doc.convert()
        console.log(html)
        expect(html).to.contain('Dark and Stormy')
      })
    })
  })

  mocha.run(function (failures) {
    if (failures > 0) {
      console.error('%d failures', failures)
    }
  })
})().catch(err => {
  console.error('Unable to start the browser tests suite: ' + err)
})
