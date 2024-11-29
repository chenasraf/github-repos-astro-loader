# GitHub Repositories Astro Loader

This is a content loader for Astro that fetches GitHub repositories and their README files, so you
can list them easily in your Astro site.

[See a demo on my website](https://casraf.dev/projects)

## Usage

In your `src/content/config.ts` file, add a new collection and use the loader:

```ts
import githubReposLoader from 'github-repos-astro-loader'
const project = defineCollection({
  loader: githubReposLoader({
    // Required
    apiToken: GITHUB_TOKEN, // GitHub API token to use for requests
    username: 'myusername', // The GitHub username you want to fetch the repositories for

    // Optional
    orgs: ['myorg'], // A list of GitHub orgs to fetch repositories from
    debug: true, // Output debug logs during processing
    force: false, // Ignore cache and force a full re-fetch
    overridesDir: 'src/content/project-overrides', // Directory to look for overrides
    filter: (repo) => // Filter repositories to include in the collection
      [
        !repo.fork,
        repo.stargazers_count! > 0,
        //
      ].every(Boolean),
    }),
  }),
})
```

Then you can use your new collection as you normally would in Astro:

```astro
---
import { getCollection } from 'astro:content'
const projects = await getCollection('project')
---

<div>
  <h3>My GitHub Projects</h3>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
    {projects.map((project) => <ProjectCard project={project} />)}
  </div>
</div>
```

### Overrides

You might want to add, or modify data for a project. To keep this easy to maintain, and to allow
markdown parsing, you can create a `my_project.md` file inside your `overridesDir`.

The default directory is `src/content/project-overrides`.

Just create an md file with all the related fields you want to override. Insert the readme Markdown
content under the properties.

These fields are editable:

- `title`
- `description`
- `order`
- `featured`

Example file: `src/content/project-overrides/my_project.md`

```md
---
title: My Project # instead of my_project
featured: true
---

This is the README content for my project. Hooray!
```

## Contributing

I am developing this package on my free time, so any support, whether code, issues, or just stars is
very helpful to sustaining its life. If you are feeling incredibly generous and would like to donate
just a small amount to help sustain this project, I would be very very thankful!

<a href='https://ko-fi.com/casraf' target='_blank'>
  <img height='36' style='border:0px;height:36px;'
    src='https://cdn.ko-fi.com/cdn/kofi1.png?v=3'
    alt='Buy Me a Coffee at ko-fi.com' />
</a>

I welcome any issues or pull requests on GitHub. If you find a bug, or would like a new feature,
don't hesitate to open an appropriate issue and I will do my best to reply promptly.
