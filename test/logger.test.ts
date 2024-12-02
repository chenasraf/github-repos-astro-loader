import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { logger } from '../src/logger'

describe('logger', () => {
  const originalConsole = console
  let spies: Record<'log' | 'error' | 'warn', ReturnType<typeof vi.fn>>

  const expected = {
    log: 0,
    error: 31,
    warn: 33,
  } as const

  beforeEach(() => {
    spies = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    }

    console = {
      ...originalConsole,
      ...(spies as any),
    }
  })

  afterEach(() => {
    console = originalConsole
  })

  beforeAll(() => {
    logger.enabled = true
  })

  test('appends time properly', () => {
    logger.log('test')
    const args = spies.log.mock.calls[0]
    const joined = args.join(' ')
    const timeIdx = 4
    const timeStr = joined.slice(timeIdx, timeIdx + 8)
    expect(timeStr).toMatch(/^\d{2}:\d{2}:\d{2}$/)
  })

  describe('colors', () => {
    test('colors prefix properly', () => {
      const prefix = logger.prefix
      logger.log('test')
      const args = spies.log.mock.calls[0]
      const joined = args.join(' ')
      const prefixIdx = joined.indexOf(prefix)
      const prefixColorIdx = prefixIdx - 6

      expect(prefixIdx).not.toBe(-1)
      expect(joined.slice(prefixColorIdx, prefixColorIdx + prefix.length)).toBe('\x1b[34m[')
    })

    test('colors time properly', () => {
      logger.log('test')
      const args = spies.log.mock.calls[0]
      originalConsole.log('ARGS: ', JSON.stringify(spies.log.mock.calls))
      const joined = args.join(' ')
      const timeColorIdx = 0
      expect(joined.slice(timeColorIdx, timeColorIdx + 4)).toBe('\x1b[2m')
    })

    for (const type of ['error', 'warn'] as const) {
      test(`colors ${type} properly`, () => {
        logger[type]('test')
        const args = spies[type].mock.calls[0]
        const joined = args.join(' ')
        const typeIdx = joined.indexOf(type.toUpperCase())
        const typeColorIdx = typeIdx - 6
        expect(joined.slice(typeColorIdx, typeColorIdx + 5)).toBe(`\x1b[${expected[type]}m`)
      })
    }
  })
})
