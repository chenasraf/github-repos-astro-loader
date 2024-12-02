import fs from 'node:fs/promises'
import path from 'node:path'
import yaml from 'yaml'
import { parseJSON as parseDate } from 'date-fns/parseJSON'
import { formatISO as formatDate } from 'date-fns/formatISO'
import {
  GitHubProjectSchema,
  GitHubProjectType,
  GitHubRepositoryAPIResponse,
  InternalLoaderOptionsType,
} from './types.js'
import { fileExists, parseMarkdown } from './utils.js'
import { logger } from './logger.js'
import { fetchRepos, getAuthorization, projectIgnore, projectKeep } from './github.js'

export async function getProjectsList(
  options: InternalLoaderOptionsType,
): Promise<GitHubProjectType[]> {
  logger.log(`Fetching projects list from GitHub (since: ${formatDate(options.lastUpdated)})`)

  if (!options.username && (!options.orgs || options.orgs.length === 0)) {
    logger.error('No username or orgs provided')
    return []
  }

  const repos: GitHubRepositoryAPIResponse[] = []
  if (options.username) {
    repos.push(
      ...(await fetchRepos(
        `https://api.github.com/users/${options.username}/repos?per_page=100`,
        options,
      )),
    )
  }
  for (const org of options.orgs ?? []) {
    repos.push(
      ...(await fetchRepos(`https://api.github.com/orgs/${org}/repos?per_page=100`, options)),
    )
  }

  logger.log(`Fetched ${repos.length} projects from GitHub`)
  const projects: GitHubProjectType[] = []

  for (const repo of repos) {
    logger.log(`Processing ${repo.name}`)
    if (!projectFilter(repo, options)) {
      logger.log()
      continue
    }

    const project = GitHubProjectSchema.parse({
      name: repo.name,
      title: repo.name,
      url: repo.html_url,
      description: repo.description,
      stars: repo.stargazers_count,
      order: -repo.stargazers_count,
      links: [{ href: repo.html_url, icon: 'logo-github', title: 'GitHub' }],
      raw: repo,
      featured: false,
    })

    const overridesFile = path.join(options.overridesDir, `${project.name}.md`)

    if (await fileExists(overridesFile)) {
      const content = await fs.readFile(overridesFile, 'utf8')
      const allLines = content.toString().split('\n')
      const lines = allLines.slice(0, allLines.lastIndexOf('---')).join('\n').trim()
      try {
        // TODO use GitHubProjectSchema.parse
        const obj = yaml.parse(lines) as GitHubProjectType
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
      `https://raw.githubusercontent.com/${repo.full_name}/${repo.default_branch}/README.md`,
      { headers: getAuthorization(options) },
    )
    const readme = readmeResponse.ok ? await readmeResponse.text() : undefined
    project.readme = readme
    logger.log(`Rendering README for ${repo.full_name}`)
    const { html } = await parseMarkdown(readme ?? '')
    project.readmeHtml = html
    projects.push(project)

    logger.log(`Added project ${repo.name}`)
    logger.log()
  }

  return projects
}

function projectFilter(
  project: GitHubRepositoryAPIResponse,
  { lastUpdated, filter }: InternalLoaderOptionsType,
): boolean {
  if (projectKeep.includes(project.name)) {
    return true
  }
  if (projectIgnore.includes(project.name)) {
    return false
  }
  const internalFilter = parseDate(project.updated_at!) > lastUpdated
  if (!internalFilter) {
    logger.log(`Skipping ${project.name} (internal filter)`)
    return false
  }
  if (filter) {
    const externalFilter = filter(project as any)
    if (!externalFilter) {
      logger.log(`Skipping ${project.name} (external filter)`)
      return false
    }
  }
  return true
}
