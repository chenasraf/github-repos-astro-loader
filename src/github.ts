import fs from 'node:fs/promises'
import path from 'node:path'
import { logger } from './logger.js'

const GITHUB_TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN!
export const headers = new Headers()
headers.set('Authorization', `Bearer ${GITHUB_TOKEN}`)

export const overridesDir = path.join(process.cwd(), 'src', 'content', 'project-overrides')
export const projectIgnoreFile = path.join(overridesDir, '.projectignore')
export const projectKeepFile = path.join(overridesDir, '.projectkeep')

export let projectIgnore: string[] = []
export let projectKeep: string[] = []

export async function fetchRepos(endpoint: string) {
  const repos = []

  let response = await fetchReposPage(endpoint)
  repos.push(...response.repos)

  while (response.url) {
    response = await fetchReposPage(response.url)
    repos.push(...response.repos)
  }

  return repos
}

async function fetchReposPage(endpoint: string) {
  logger.log('Fetching endpoint', endpoint)
  const response = await fetch(endpoint, { headers })
  if (!response.ok) {
    logger.error('Failed to fetch repos:', response.statusText)
    logger.error(await response.text())
    throw new Error(`Failed to fetch repos: ${response.statusText}`)
  }
  const repos = await response.json()
  const links = response.headers.get('link')
  let url: string | null = null
  if (links) {
    logger.log('GH API Links:', links)
    const next = links.split(',').find((link) => link.includes('rel="next"'))
    if (next) {
      url = next.split(';', 1).toString().slice(1, -1)
    }
  }
  logger.log('Fetched endpoint', endpoint, 'with', repos.length, 'repos')
  return { repos, url }
}

async function loadFileList(file: string): Promise<string[]> {
  return (await fs.readFile(file, 'utf8'))
    .split('\n')
    .map((i) => i.trim())
    .filter(Boolean)
    .filter((x) => x[0] !== '#')
}

export async function reloadOverrides() {
  projectIgnore = await loadFileList(projectIgnoreFile)
  projectKeep = await loadFileList(projectKeepFile)
}
