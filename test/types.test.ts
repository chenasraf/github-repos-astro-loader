import { expect, test, describe } from 'vitest'
import * as t from '../src/types'

describe('types', () => {
  describe('LinkSchema', () => {
    test('is defined', () => {
      expect(t.LinkSchema).toBeDefined()
    })

    test('parses valid input', () => {
      const input = {
        title: 'title',
        href: 'href',
        icon: 'icon',
      }
      const output = t.LinkSchema.parse(input)
      expect(output).toEqual(input)
    })

    test('throws on invalid input', () => {
      const invalidInput = {
        title: 'title',
        icon: 'icon',
      }
      expect(() => t.LinkSchema.parse(invalidInput)).toThrow()
    })
  })

  describe('GitHubProjectSchema', () => {
    test('is defined', () => {
      expect(t.GitHubProjectSchema).toBeDefined()
    })

    test('parses valid input', () => {
      const input = {
        name: 'name',
        title: 'title',
        description: 'description',
        url: 'url',
        stars: 1,
        order: 1,
        links: [{ title: 'title', href: 'href' }],
        featured: true,
        raw: {},
      }
      const output = t.GitHubProjectSchema.parse(input)
      expect(output).toEqual(input)
    })

    test('throws on invalid input', () => {
      const invalidInput = {
        name: 'name',
        title: 'title',
        description: 'description',
        url: 'url',
        stars: 1,
        order: 1,
        links: [{ title: 'title' }],
        featured: true,
        raw: {},
      }
      expect(() => t.GitHubProjectSchema.parse(invalidInput)).toThrow()
    })
  })

  describe('LoaderOptions', () => {
    test('is defined', () => {
      expect(t.LoaderOptions).toBeDefined()
    })

    test('parses valid input', () => {
      const input = {
        debug: true,
        force: true,
        orgs: ['org'],
        overridesDir: 'dir',
        apiToken: 'token',
      }
      const output = t.LoaderOptions.parse(input)
      expect(output).toEqual(input)
    })

    test('throws on invalid input', () => {
      const invalidInput = {
        debug: true,
        force: true,
        orgs: ['org'],
        overridesDir: 'dir',
        lastUpdated: 'invalid',
      }
      expect(() => t.LoaderOptions.parse(invalidInput)).toThrow()
    })
  })
})
