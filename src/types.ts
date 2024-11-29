import { Endpoints } from '@octokit/types'
import { z } from 'zod'

/**
 * Schema for a link.
 */
export const LinkSchema = z.object({
  title: z.string(),
  href: z.string(),
  icon: z.string(),
})

/**
 * Schema for a link.
 */
export type TLinkSchema = {
  /** The title of the link. */
  title: string
  /** The URL the link points to. */
  href: string
  /** The icon associated with the link. */
  icon: string
}

/**
 * Schema for a GitHub project.
 */
export const GitHubProjectSchema = z.object({
  name: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  url: z.string(),
  stars: z.number(),
  readme: z.string().optional(),
  readmeHtml: z.string().optional(),
  order: z.number(),
  links: z.array(LinkSchema),
  featured: z.boolean(),
  raw: z.any() as z.ZodType<GitHubRepositoryAPIResponse>,
})

/**
 * Schema for a GitHub project.
 */
export type GitHubProjectType = {
  /** The name of the GitHub project. */
  name: string
  /** The title of the GitHub project. */
  title: string
  /** The description of the GitHub project. */
  description: string | null
  /** The URL of the GitHub project. */
  url: string
  /** The number of stars the GitHub project has. */
  stars: number
  /** The README content of the GitHub project. */
  readme?: string
  /** The HTML content of the README. */
  readmeHtml?: string
  /** The order of the GitHub project in a list. */
  order: number
  /** The links associated with the GitHub project. */
  links: TLinkSchema[]
  /** Whether the GitHub project is featured. */
  featured: boolean
  /** Raw response from GitHub API, containing all fields. */
  raw: GitHubRepositoryAPIResponse
}

/** GitHub API response for a repository. */
export type GitHubRepositoryAPIResponse = NonNullable<
  Required<Endpoints['GET /users/{username}/repos']['response']['data'][number]>
>

/**
 * Schema for loader options.
 */
export const LoaderOptions = z.object({
  username: z.string(),
  debug: z.boolean(),
  orgs: z.array(z.string()).optional(),
  filter: z
    .function()
    .args(z.any() as z.ZodType<GitHubRepositoryAPIResponse>)
    .returns(z.boolean())
    .optional(),
  apiToken: z.string(),
  force: z.boolean(),
  overridesDir: z.string().optional(),
})

/**
 * Schema for loader options.
 */
export type LoaderOptionsType = {
  /** The username from GitHub to fetch the repositories from. */
  username: string
  /** Debug flag - if true, the loader will output debug information. */
  debug?: boolean
  /** GitHub organizations to fetch projects from. */
  orgs?: string[]
  /** A function to filter out projects. Filtered projects will not be parsed or saved in the collection. */
  // eslint-disable-next-line no-unused-vars
  filter?: (project: GitHubRepositoryAPIResponse) => boolean
  /** The GitHub API token to use for fetching the repositories. */
  apiToken: string
  /** Whether to force a reload of the projects, regardless of cache status. */
  force?: boolean
  /** The directory where project overrides are stored (default: `src/content/project-overrides`). */
  overridesDir?: string
}

/** @internal */
export const InternalLoaderOptions = LoaderOptions.required().extend({
  lastUpdated: z.date(),
})

/** @internal */
export type InternalLoaderOptionsType = Required<LoaderOptionsType> & {
  /** The last time the projects were updated. */
  lastUpdated: Date
}
