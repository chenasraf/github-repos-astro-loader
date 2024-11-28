import { Endpoints } from '@octokit/types'
import { z } from 'zod'

/**
 * Schema for a link.
 */
export const LinkSchema = z.object({
  /** The title of the link. */
  title: z.string(),
  /** The URL the link points to. */
  href: z.string(),
  /** The icon associated with the link. */
  icon: z.string(),
})
export type LinkSchema = z.infer<typeof LinkSchema>

/**
 * Schema for a GitHub project.
 */
export const GitHubProjectSchema = z.object({
  /** The name of the GitHub project. */
  name: z.string(),
  /** The title of the GitHub project. */
  title: z.string(),
  /** The description of the GitHub project. */
  description: z.string().nullable(),
  /** The URL of the GitHub project. */
  url: z.string(),
  /** The number of stars the GitHub project has. */
  stars: z.number(),
  /** The README content of the GitHub project. */
  readme: z.string().optional(),
  /** The HTML content of the README. */
  readmeHtml: z.string().optional(),
  /** The order of the GitHub project in a list. */
  order: z.number(),
  /** The links associated with the GitHub project. */
  links: z.array(LinkSchema),
  /** Whether the GitHub project is featured. */
  featured: z.boolean().optional().default(false),
  /** Raw response from GitHub API, containing all fields. */
  raw: z.any(),
})
export type GitHubProjectSchema = z.infer<typeof GitHubProjectSchema>

export type GitHubRepositoryAPIResponse = NonNullable<
  Required<Endpoints['GET /users/{username}/repos']['response']['data'][number]>
>

/**
 * Schema for loader options.
 */
export const LoaderOptions = z.object({
  /** The username from GitHub to fetch the repositories from. */
  username: z.string(),
  /** Debug flag - if true, the loader will output debug information. */
  debug: z.boolean().optional(),
  /** GitHub organizations to fetch projects from. */
  orgs: z.array(z.string()).optional(),
  /** A function to filter out projects. Filtered projects will not be parsed or saved in the collection. */
  filter: z
    .function()
    .args(z.any() as z.ZodType<GitHubRepositoryAPIResponse>)
    .returns(z.boolean())
    .optional(),
  /** The GitHub API token to use for fetching the repositories. */
  apiToken: z.string(),
  /** Whether to force a reload of the projects, regardless of cache status. */
  force: z.boolean().optional(),
})
export type LoaderOptions = z.infer<typeof LoaderOptions>

export const InternalLoaderOptions = LoaderOptions.required().extend({
  lastUpdated: z.date(),
})
export type InternalLoaderOptions = z.infer<typeof InternalLoaderOptions>
