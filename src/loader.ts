import type { Loader, LoaderContext } from 'astro/loaders'
import { reloadOverrides } from './github.js'
import { parseJSON as parseDate } from 'date-fns/parseJSON'
import { formatISO as formatDate } from 'date-fns/formatISO'
import type { GitHubProjectType, LoaderOptionsType } from './types.js'
import { GitHubProjectSchema, InternalLoaderOptions } from './types.js'
import { logger } from './logger.js'
import { getProjectsList } from './parser.js'
import path from 'path'
import { z } from 'zod'

const defaultOverridesDir = path.join(process.cwd(), 'src', 'content', 'project-overrides')

async function reloadProjects(
  { store, meta }: Pick<LoaderContext, 'store' | 'meta'>,
  opts: LoaderOptionsType,
) {
  logger.enabled = opts.debug ?? false
  const lastUpdated = parseDate(
    (opts.force ? undefined : meta.get('lastUpdated')) ?? '1970-01-01T00:00:00Z',
  )

  const options = InternalLoaderOptions.parse({
    debug: false,
    force: false,
    orgs: [],
    overridesDir: defaultOverridesDir,
    ...opts,
    lastUpdated,
  })
  await reloadOverrides(options)
  const projects = await getProjectsList(options)

  logger.log(projects.length, 'projects loaded')

  for (const project of projects) {
    store.set({
      id: project.name,
      data: project,
      rendered: project.readmeHtml ? { html: project.readmeHtml } : undefined,
    })
  }
  const newLastUpdated = formatDate(new Date())
  meta.set('lastUpdated', newLastUpdated)
  logger.log('Projects loaded')
}

/**
 * A loader that fetches GitHub repositories for a user and organization(s).
 * @param opts The loader options.
 */
export function githubProjectsLoader(opts: LoaderOptionsType): Loader {
  return {
    name: 'github-repos-loader',
    schema: GitHubProjectSchema as unknown as z.ZodType<GitHubProjectType>,
    load: async ({ store, meta, watcher }) => {
      await reloadProjects({ store, meta }, opts)

      watcher?.on('change', async (filename) => {
        if (path.dirname(filename) === (opts.overridesDir ?? defaultOverridesDir)) {
          logger.log('Change detected:', filename)
          await reloadProjects({ store, meta }, opts)
        }
      })
    },
  }
}
