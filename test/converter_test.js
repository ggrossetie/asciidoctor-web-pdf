import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { load } from '@asciidoctor/core'
import { registerTemplateConverter } from '../lib/converter.js'
import { templates } from '../lib/document/document-converter.js'

describe('registerTemplateConverter', () => {
  it('should register the converter for the pdf backend', async () => {
    registerTemplateConverter(templates)
    const doc = await load('= Test\n\ncontent', { backend: 'pdf' })
    assert.strictEqual(doc.getAttribute('backend'), 'pdf')
    assert.strictEqual(doc.getAttribute('basebackend'), 'html')
    assert.strictEqual(doc.getAttribute('filetype'), 'pdf')
    assert.strictEqual(doc.getAttribute('outfilesuffix'), '.pdf')
  })
})
