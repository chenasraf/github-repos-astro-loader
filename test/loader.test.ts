import { describe, expect, test, vi, beforeEach } from 'vitest'
import path from 'node:path'
import { githubProjectsLoader } from '../src/loader'
import type { LoaderOptionsType } from '../src/types'

// Mock the parser module
vi.mock('../src/parser', () => ({
  getProjectsList: vi.fn().mockResolvedValue([
    {
      name: 'mock-project',
      title: 'Mock Project',
      description: 'desc',
      url: 'https://github.com/user/mock-project',
      stars: 5,
      order: -5,
      links: [],
      featured: false,
      raw: {},
      readmeHtml: '<p>hello</p>',
    },
  ]),
}))

// Mock github module
vi.mock('../src/github', () => ({
  reloadOverrides: vi.fn().mockResolvedValue(undefined),
}))

// Suppress logger
vi.mock('../src/logger', () => ({
  logger: { enabled: false, log: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

import { getProjectsList } from '../src/parser'
import { reloadOverrides } from '../src/github'

function makeMeta() {
  const data = new Map<string, string>()
  return {
    get: (key: string) => data.get(key),
    set: (key: string, value: string) => data.set(key, value),
    delete: (key: string) => data.delete(key),
    has: (key: string) => data.has(key),
    _data: data,
  }
}

function makeStore() {
  const entries: any[] = []
  return {
    set: vi.fn((entry: any) => entries.push(entry)),
    entries,
  }
}

function makeWatcher() {
  const handlers: Record<string, Function[]> = {}
  return {
    on: vi.fn((event: string, handler: Function) => {
      handlers[event] = handlers[event] || []
      handlers[event].push(handler)
    }),
    emit: (event: string, ...args: any[]) => {
      for (const handler of handlers[event] ?? []) {
        handler(...args)
      }
    },
    handlers,
  }
}

const defaultOpts: LoaderOptionsType = {
  username: 'testuser',
  apiToken: 'test-token',
  debug: false,
  force: false,
  filter: () => true,
}

describe('loader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('githubProjectsLoader', () => {
    test('returns loader with correct name and schema', () => {
      const loader = githubProjectsLoader(defaultOpts)
      expect(loader.name).toBe('github-repos-loader')
      expect(loader.schema).toBeDefined()
    })

    test('load calls reloadOverrides and getProjectsList', async () => {
      const loader = githubProjectsLoader(defaultOpts)
      const meta = makeMeta()
      const store = makeStore()

      await loader.load({ store, meta, watcher: undefined } as any)

      expect(reloadOverrides).toHaveBeenCalled()
      expect(getProjectsList).toHaveBeenCalled()
    })

    test('populates store with projects', async () => {
      const loader = githubProjectsLoader(defaultOpts)
      const meta = makeMeta()
      const store = makeStore()

      await loader.load({ store, meta, watcher: undefined } as any)

      expect(store.set).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'mock-project',
          data: expect.objectContaining({ name: 'mock-project' }),
          rendered: { html: '<p>hello</p>' },
        }),
      )
    })

    test('sets lastUpdated in meta after loading', async () => {
      const loader = githubProjectsLoader(defaultOpts)
      const meta = makeMeta()
      const store = makeStore()

      await loader.load({ store, meta, watcher: undefined } as any)

      expect(meta.has('lastUpdated')).toBe(true)
    })

    test('uses cached lastUpdated on subsequent loads', async () => {
      const loader = githubProjectsLoader(defaultOpts)
      const meta = makeMeta()
      const store = makeStore()

      // First load
      await loader.load({ store, meta, watcher: undefined } as any)
      const firstCallOptions = vi.mocked(getProjectsList).mock.calls[0][0]

      // Second load (simulated by calling load again)
      await loader.load({ store, meta, watcher: undefined } as any)
      const secondCallOptions = vi.mocked(getProjectsList).mock.calls[1][0]

      // Second call should have a more recent lastUpdated than the first
      expect(secondCallOptions.lastUpdated.getTime()).toBeGreaterThan(
        firstCallOptions.lastUpdated.getTime(),
      )
    })

    test('force option ignores cached lastUpdated', async () => {
      const loader = githubProjectsLoader({ ...defaultOpts, force: true })
      const meta = makeMeta()
      meta.set('lastUpdated', '2025-06-01T00:00:00Z')
      const store = makeStore()

      await loader.load({ store, meta, watcher: undefined } as any)

      const callOptions = vi.mocked(getProjectsList).mock.calls[0][0]
      // Should be epoch, not the cached value
      expect(callOptions.lastUpdated.getFullYear()).toBe(1970)
    })
  })

  describe('watcher', () => {
    test('registers change handler on watcher', async () => {
      const loader = githubProjectsLoader(defaultOpts)
      const meta = makeMeta()
      const store = makeStore()
      const watcher = makeWatcher()

      await loader.load({ store, meta, watcher } as any)

      expect(watcher.on).toHaveBeenCalledWith('change', expect.any(Function))
    })

    test('clears cache when override file changes', async () => {
      const overridesDir = path.join(process.cwd(), 'src', 'content', 'project-overrides')
      const loader = githubProjectsLoader(defaultOpts)
      const meta = makeMeta()
      const store = makeStore()
      const watcher = makeWatcher()

      await loader.load({ store, meta, watcher } as any)

      // Meta should have lastUpdated from initial load
      expect(meta.has('lastUpdated')).toBe(true)

      vi.clearAllMocks()

      // Simulate override file change
      await watcher.emit('change', path.join(overridesDir, 'some-project.md'))

      // Should have cleared and re-set lastUpdated
      expect(getProjectsList).toHaveBeenCalled()
      // The lastUpdated passed should be epoch (cache was cleared)
      const callOptions = vi.mocked(getProjectsList).mock.calls[0][0]
      expect(callOptions.lastUpdated.getFullYear()).toBe(1970)
    })

    test('ignores changes outside overrides directory', async () => {
      const loader = githubProjectsLoader(defaultOpts)
      const meta = makeMeta()
      const store = makeStore()
      const watcher = makeWatcher()

      await loader.load({ store, meta, watcher } as any)
      vi.clearAllMocks()

      // Simulate change in a different directory
      await watcher.emit('change', '/some/other/dir/file.md')

      expect(getProjectsList).not.toHaveBeenCalled()
    })

    test('uses custom overridesDir for watcher filtering', async () => {
      const customDir = '/custom/overrides'
      const loader = githubProjectsLoader({ ...defaultOpts, overridesDir: customDir })
      const meta = makeMeta()
      const store = makeStore()
      const watcher = makeWatcher()

      await loader.load({ store, meta, watcher } as any)
      vi.clearAllMocks()

      // Change in custom dir should trigger reload
      await watcher.emit('change', path.join(customDir, 'project.md'))
      expect(getProjectsList).toHaveBeenCalled()

      vi.clearAllMocks()

      // Change in default dir should NOT trigger reload
      const defaultDir = path.join(process.cwd(), 'src', 'content', 'project-overrides')
      await watcher.emit('change', path.join(defaultDir, 'project.md'))
      expect(getProjectsList).not.toHaveBeenCalled()
    })
  })

  describe('rendered content', () => {
    test('omits rendered when readmeHtml is empty', async () => {
      vi.mocked(getProjectsList).mockResolvedValueOnce([
        {
          name: 'no-readme',
          title: 'No Readme',
          description: null,
          url: 'https://github.com/user/no-readme',
          stars: 0,
          order: 0,
          links: [],
          featured: false,
          raw: {} as any,
        },
      ])

      const loader = githubProjectsLoader(defaultOpts)
      const meta = makeMeta()
      const store = makeStore()

      await loader.load({ store, meta, watcher: undefined } as any)

      expect(store.set).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'no-readme',
          rendered: undefined,
        }),
      )
    })
  })
})
