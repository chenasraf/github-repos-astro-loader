import { describe, expect, test } from 'vitest'
import { stripHtml, fileExists, absolutizeReadmeAssets } from '../src/utils'
import path from 'path'

describe('utils', () => {
  describe('stripHtml', () => {
    test('strips simple tags', () => {
      expect(stripHtml('<p>hello</p>')).toBe('hello')
    })

    test('strips nested tags', () => {
      expect(stripHtml('<div><p>hello</p></div>')).toBe('hello')
    })

    test('strips self-closing tags', () => {
      expect(stripHtml('hello<br/>world')).toBe('helloworld')
    })

    test('strips tags with attributes', () => {
      expect(stripHtml('<a href="url" class="link">text</a>')).toBe('text')
    })

    test('returns empty string for empty input', () => {
      expect(stripHtml('')).toBe('')
    })

    test('returns plain text unchanged', () => {
      expect(stripHtml('no tags here')).toBe('no tags here')
    })
  })

  describe('fileExists', () => {
    test('returns true for existing file', async () => {
      expect(await fileExists(path.resolve(__dirname, 'utils.test.ts'))).toBe(true)
    })

    test('returns false for non-existing file', async () => {
      expect(await fileExists('/nonexistent/path/file.txt')).toBe(false)
    })

    test('returns false for non-existing directory', async () => {
      expect(await fileExists('/nonexistent/dir')).toBe(false)
    })
  })

  describe('absolutizeReadmeAssets', () => {
    const base = 'https://raw.githubusercontent.com/owner/repo/main/'

    test('rewrites root-absolute image sources', () => {
      expect(absolutizeReadmeAssets('<img src="/demo.gif">', 'owner/repo', 'main')).toBe(
        `<img src="${base}demo.gif">`,
      )
    })

    test('rewrites repo-relative image sources', () => {
      expect(absolutizeReadmeAssets('<img src="docs/demo.png">', 'owner/repo', 'main')).toBe(
        `<img src="${base}docs/demo.png">`,
      )
    })

    test('strips leading ./ from relative sources', () => {
      expect(absolutizeReadmeAssets('<img src="./demo.png">', 'owner/repo', 'main')).toBe(
        `<img src="${base}demo.png">`,
      )
    })

    test('leaves absolute http(s) sources untouched', () => {
      const html = '<img src="https://example.com/demo.png">'
      expect(absolutizeReadmeAssets(html, 'owner/repo', 'main')).toBe(html)
    })

    test('leaves data: sources untouched', () => {
      const html = '<img src="data:image/png;base64,AAAA">'
      expect(absolutizeReadmeAssets(html, 'owner/repo', 'main')).toBe(html)
    })

    test('does not rewrite anchor hrefs', () => {
      const html = '<a href="/docs">docs</a>'
      expect(absolutizeReadmeAssets(html, 'owner/repo', 'main')).toBe(html)
    })

    test('rewrites multiple images and preserves other attributes', () => {
      const html = '<img alt="a" src="/a.png"><img src="b.png" width="10">'
      expect(absolutizeReadmeAssets(html, 'owner/repo', 'main')).toBe(
        `<img alt="a" src="${base}a.png"><img src="${base}b.png" width="10">`,
      )
    })

    test('returns empty string unchanged', () => {
      expect(absolutizeReadmeAssets('', 'owner/repo', 'main')).toBe('')
    })
  })
})
