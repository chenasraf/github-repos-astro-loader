import { describe, expect, test } from 'vitest'
import { stripHtml, fileExists } from '../src/utils'
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
})
