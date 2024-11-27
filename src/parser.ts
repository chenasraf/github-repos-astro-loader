import fs from 'node:fs/promises'
import path from 'node:path'
import yaml from 'yaml'
import { parseJSON as parseDate } from 'date-fns/parseJSON'
import { formatISO as formatDate } from 'date-fns/formatISO'
import { GitHubProjectSchema, InternalLoaderOptions } from './types.js'
import { fileExists, parseMarkdown } from './utils.js'
import { logger } from './logger.js'
import { fetchRepos, headers, overridesDir, projectIgnore, projectKeep } from './github.js'

export async function getProjectsList(
  options: InternalLoaderOptions,
): Promise<GitHubProjectSchema[]> {
  logger.log(`Fetching projects list from GitHub (since: ${formatDate(options.lastUpdated)})`)

  const repos = await fetchRepos(
    `https://api.github.com/users/${options.username}/repos?per_page=100`,
  )
  for (const org of options.orgs) {
    repos.push(...(await fetchRepos(`https://api.github.com/orgs/${org}/repos?per_page=100`)))
  }

  logger.log(`Fetched ${repos.length} projects from GitHub`)
  const projects: GitHubProjectSchema[] = []

  for (const repo of repos) {
    logger.log(`Processing ${repo.name}`)
    if (!projectFilter(repo, options)) {
      logger.log(`Skipping ${repo.name}`)
      continue
    }

    const project = GitHubProjectSchema.parse({
      name: repo.name,
      title: repo.name,
      url: repo.html_url,
      description: `<p>${repo.description}</p>`,
      stars: repo.stargazers_count,
      order: -repo.stargazers_count,
      links: [{ href: repo.html_url, icon: 'logo-github', title: 'GitHub' }],
    })

    const overridesFile = path.join(overridesDir, `${project.name}.md`)

    if (await fileExists(overridesFile)) {
      const content = await fs.readFile(overridesFile, 'utf8')
      const allLines = content.toString().split('\n')
      const lines = allLines.slice(0, allLines.lastIndexOf('---')).join('\n').trim()
      try {
        // TODO use GitHubProjectSchema.parse
        const obj = yaml.parse(lines) as GitHubProjectSchema
        for (const link of obj.links ?? []) {
          const found = project.links.findIndex((i) => i.href === link.href)
          if (found >= 0) {
            project.links.splice(found, 1, link)
          } else {
            project.links.push(link)
          }
        }
        for (const key of ['title', 'order', 'description', 'featured'] as const) {
          if (obj[key as keyof typeof obj] != null) {
            project[key as keyof typeof project] = obj[key as keyof typeof obj] as never
          }
        }
        if (project.featured) {
          project.order -= 1000
        }
      } catch (e) {
        logger.error('Error parsing project overrides file')
        logger.error(e)
      }
    }

    logger.log(`Fetching README for ${repo.name}`)

    const readmeResponse = await fetch(
      `https://raw.githubusercontent.com/${options.username}/${repo.name}/${repo.default_branch}/README.md`,
      { headers },
    )
    const readme = readmeResponse.ok ? await readmeResponse.text() : undefined
    project.readme = readme
    logger.log(`Rendering README for ${repo.name}`)
    const { html } = await parseMarkdown(readme ?? '')
    project.readmeHtml = html
    projects.push(project)

    logger.log(`Added project ${repo.name}`)
  }

  return projects
}

function projectFilter(
  project: Record<string, any>,
  { lastUpdated }: InternalLoaderOptions,
): boolean {
  if (projectKeep.includes(project.name)) {
    return true
  }
  if (projectIgnore.includes(project.name)) {
    return false
  }
  return [
    parseDate(project.updated_at) > lastUpdated,
    !project.fork,
    project.stargazers_count > 0,
    //
  ].every(Boolean)
}
