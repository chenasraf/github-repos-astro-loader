import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {
  getProjectIgnoreFile,
  getProjectKeepFile,
  getAuthorization,
  reloadOverrides,
  projectIgnore,
  projectKeep,
} from '../src/github'

describe('github', () => {
  describe('getProjectIgnoreFile', () => {
    test('returns path to .projectignore in overridesDir', () => {
      const result = getProjectIgnoreFile({ overridesDir: '/some/dir' })
      expect(result).toBe(path.resolve('/some/dir', '.projectignore'))
    })
  })

  describe('getProjectKeepFile', () => {
    test('returns path to .projectkeep in overridesDir', () => {
      const result = getProjectKeepFile({ overridesDir: '/some/dir' })
      expect(result).toBe(path.resolve('/some/dir', '.projectkeep'))
    })
  })

  describe('getAuthorization', () => {
    test('returns headers with bearer token', () => {
      const headers = getAuthorization({ apiToken: 'test-token' } as any)
      expect(headers.get('Authorization')).toBe('Bearer test-token')
    })

    test('returns Headers instance', () => {
      const headers = getAuthorization({ apiToken: 'abc' } as any)
      expect(headers).toBeInstanceOf(Headers)
    })
  })

  describe('reloadOverrides', () => {
    let tmpDir: string

    beforeEach(async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ghrepo-test-'))
    })

    afterEach(async () => {
      await fs.rm(tmpDir, { recursive: true })
    })

    test('loads projectignore and projectkeep files', async () => {
      await fs.writeFile(path.join(tmpDir, '.projectignore'), 'ignored-repo\nanother-ignored\n')
      await fs.writeFile(path.join(tmpDir, '.projectkeep'), 'kept-repo\n')

      await reloadOverrides({ overridesDir: tmpDir } as any)

      expect(projectIgnore).toEqual(['ignored-repo', 'another-ignored'])
      expect(projectKeep).toEqual(['kept-repo'])
    })

    test('ignores comments and blank lines', async () => {
      await fs.writeFile(
        path.join(tmpDir, '.projectignore'),
        '# comment\nrepo1\n\n# another comment\nrepo2\n',
      )
      await fs.writeFile(path.join(tmpDir, '.projectkeep'), '# keep these\nrepo3\n')

      await reloadOverrides({ overridesDir: tmpDir } as any)

      expect(projectIgnore).toEqual(['repo1', 'repo2'])
      expect(projectKeep).toEqual(['repo3'])
    })

    test('trims whitespace from entries', async () => {
      await fs.writeFile(path.join(tmpDir, '.projectignore'), '  spaced-repo  \n')
      await fs.writeFile(path.join(tmpDir, '.projectkeep'), '  kept  \n')

      await reloadOverrides({ overridesDir: tmpDir } as any)

      expect(projectIgnore).toEqual(['spaced-repo'])
      expect(projectKeep).toEqual(['kept'])
    })
  })
})
