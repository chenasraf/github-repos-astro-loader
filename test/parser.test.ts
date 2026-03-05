import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { getProjectsList } from '../src/parser'
import type { InternalLoaderOptionsType } from '../src/types'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Suppress logger output during tests
vi.mock('../src/logger', () => ({
  logger: { enabled: false, log: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

function makeRepo(overrides: Record<string, any> = {}) {
  return {
    name: 'test-repo',
    html_url: 'https://github.com/user/test-repo',
    full_name: 'user/test-repo',
    description: 'A test repo',
    stargazers_count: 10,
    default_branch: 'main',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeOptions(overrides: Partial<InternalLoaderOptionsType> = {}): InternalLoaderOptionsType {
  return {
    username: 'testuser',
    debug: false,
    force: false,
    orgs: [],
    overridesDir: '/tmp/nonexistent-overrides',
    apiToken: 'test-token',
    lastUpdated: new Date('1970-01-01T00:00:00Z'),
    filter: undefined as any,
    ...overrides,
  }
}

function mockGitHubAPI(repos: any[]) {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes('api.github.com')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(repos),
        headers: new Headers(),
      })
    }
    // README fetch
    if (url.includes('raw.githubusercontent.com')) {
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve('# README'),
      })
    }
    return Promise.resolve({ ok: false })
  })
}

describe('parser', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe('getProjectsList', () => {
    test('returns empty array when no username or orgs', async () => {
      const result = await getProjectsList(
        makeOptions({ username: undefined as any, orgs: [] }),
      )
      expect(result).toEqual([])
    })

    test('fetches and parses projects from GitHub', async () => {
      mockGitHubAPI([makeRepo()])
      const result = await getProjectsList(makeOptions())

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('test-repo')
      expect(result[0].title).toBe('test-repo')
      expect(result[0].description).toBe('A test repo')
      expect(result[0].stars).toBe(10)
      expect(result[0].order).toBe(-10)
      expect(result[0].featured).toBe(false)
      expect(result[0].links).toEqual([
        { href: 'https://github.com/user/test-repo', icon: 'logo-github', title: 'GitHub' },
      ])
    })

    test('fetches README and renders HTML', async () => {
      mockGitHubAPI([makeRepo()])
      const result = await getProjectsList(makeOptions())

      expect(result[0].readme).toBe('# README')
      expect(result[0].readmeHtml).toContain('README')
    })

    test('handles missing README gracefully', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('api.github.com')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([makeRepo()]),
            headers: new Headers(),
          })
        }
        return Promise.resolve({ ok: false })
      })

      const result = await getProjectsList(makeOptions())
      expect(result[0].readme).toBeUndefined()
    })

    test('filters out projects older than lastUpdated', async () => {
      mockGitHubAPI([
        makeRepo({ name: 'old-repo', updated_at: '2024-01-01T00:00:00Z' }),
        makeRepo({ name: 'new-repo', updated_at: '2025-06-01T00:00:00Z' }),
      ])

      const result = await getProjectsList(
        makeOptions({ lastUpdated: new Date('2025-03-01T00:00:00Z') }),
      )

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('new-repo')
    })

    test('applies external filter function', async () => {
      mockGitHubAPI([
        makeRepo({ name: 'keep-me' }),
        makeRepo({ name: 'remove-me' }),
      ])

      const result = await getProjectsList(
        makeOptions({ filter: (repo: any) => repo.name === 'keep-me' }),
      )

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('keep-me')
    })

    test('fetches from orgs as well as username', async () => {
      mockGitHubAPI([makeRepo()])

      await getProjectsList(makeOptions({ orgs: ['my-org'] }))

      const urls = mockFetch.mock.calls.map((c) => c[0])
      expect(urls.some((u: string) => u.includes('/users/testuser/repos'))).toBe(true)
      expect(urls.some((u: string) => u.includes('/orgs/my-org/repos'))).toBe(true)
    })
  })

  describe('project overrides', () => {
    let tmpDir: string

    beforeEach(async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ghrepo-overrides-'))
    })

    afterEach(async () => {
      await fs.rm(tmpDir, { recursive: true })
    })

    test('applies scalar overrides from file', async () => {
      await fs.writeFile(
        path.join(tmpDir, 'test-repo.md'),
        `---
title: Custom Title
description: Custom description
order: 5
---`,
      )
      mockGitHubAPI([makeRepo()])

      const result = await getProjectsList(makeOptions({ overridesDir: tmpDir }))

      expect(result[0].title).toBe('Custom Title')
      expect(result[0].description).toBe('Custom description')
      expect(result[0].order).toBe(5)
    })

    test('merges link overrides', async () => {
      await fs.writeFile(
        path.join(tmpDir, 'test-repo.md'),
        `---
links:
  - title: Docs
    href: https://docs.example.com
    icon: book
---`,
      )
      mockGitHubAPI([makeRepo()])

      const result = await getProjectsList(makeOptions({ overridesDir: tmpDir }))

      expect(result[0].links).toHaveLength(2)
      expect(result[0].links[1]).toEqual({
        title: 'Docs',
        href: 'https://docs.example.com',
        icon: 'book',
      })
    })

    test('replaces existing link with same href', async () => {
      await fs.writeFile(
        path.join(tmpDir, 'test-repo.md'),
        `---
links:
  - title: Updated GitHub
    href: https://github.com/user/test-repo
    icon: custom-icon
---`,
      )
      mockGitHubAPI([makeRepo()])

      const result = await getProjectsList(makeOptions({ overridesDir: tmpDir }))

      expect(result[0].links).toHaveLength(1)
      expect(result[0].links[0].title).toBe('Updated GitHub')
      expect(result[0].links[0].icon).toBe('custom-icon')
    })

    test('applies featured bonus to order', async () => {
      await fs.writeFile(
        path.join(tmpDir, 'test-repo.md'),
        `---
featured: true
---`,
      )
      mockGitHubAPI([makeRepo({ stargazers_count: 10 })])

      const result = await getProjectsList(makeOptions({ overridesDir: tmpDir }))

      expect(result[0].featured).toBe(true)
      expect(result[0].order).toBe(-1010) // -10 (stars) - 1000 (featured bonus)
    })

    test('ignores non-existent override files', async () => {
      mockGitHubAPI([makeRepo()])

      const result = await getProjectsList(makeOptions({ overridesDir: tmpDir }))

      expect(result[0].title).toBe('test-repo') // unchanged
    })
  })
})
