import type { Loader, LoaderContext } from 'astro/loaders'
import { projectIgnoreFile, projectKeepFile, reloadOverrides } from './github.js'
import { parseJSON as parseDate } from 'date-fns/parseJSON'
import { formatISO as formatDate } from 'date-fns/formatISO'
import { LoaderOptions, InternalLoaderOptions } from './types.js'
import { logger } from './logger.js'
import { getProjectsList } from './parser.js'

async function reloadProjects(
  { store, meta }: Pick<LoaderContext, 'store' | 'meta'>,
  opts: LoaderOptions,
) {
  logger.enabled = opts.debug ?? false
  const lastUpdated = parseDate(
    (opts.force ? undefined : meta.get('lastUpdated')) ?? '1970-01-01T00:00:00Z',
  )

  await reloadOverrides()
  const options = InternalLoaderOptions.parse({
    debug: false,
    orgs: [],
    ...opts,
    lastUpdated,
  })
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

export function githubProjectsLoader(opts: LoaderOptions): Loader {
  return {
    name: 'github-repos-loader',
    load: async ({ store, meta, watcher }) => {
      await reloadProjects({ store, meta }, opts)

      watcher?.on('change', async (filename) => {
        logger.log('Change detected:', filename)
        if ([projectIgnoreFile, projectKeepFile].includes(filename)) {
          await reloadProjects({ store, meta }, opts)
        }
      })
    },
  }
}
