import { markdown } from '@astropub/md'
import fs from 'fs/promises'

export async function parseMarkdown(content: string): Promise<{ html: string; stripped: string }> {
  const html = (await markdown(content)).toString()
  return {
    html,
    stripped: stripHtml(html),
  }
}

export function stripHtml(content: string): string {
  return content.replace(/<[^>]*>?/gm, '')
}

/**
 * Rewrites `<img>` sources in rendered README HTML to absolute GitHub raw URLs.
 *
 * READMEs commonly reference images with repo-relative (`docs/demo.png`) or
 * root-absolute (`/demo.gif`) paths, which only resolve within GitHub. When the
 * README is rendered on another site those paths 404, so we resolve them against
 * `raw.githubusercontent.com`. Already-absolute (`http(s):`, `data:`), anchor and
 * `mailto:` sources are left untouched.
 *
 * @param html The rendered README HTML.
 * @param fullName The repository's `owner/repo` full name.
 * @param branch The branch to resolve assets against (usually the default branch).
 */
export function absolutizeReadmeAssets(html: string, fullName: string, branch: string): string {
  const base = `https://raw.githubusercontent.com/${fullName}/${branch}/`
  return html.replace(/(<img\b[^>]*?\bsrc=")([^"]+)"/gi, (match, prefix, url) =>
    /^(https?:|data:|#|mailto:)/i.test(url) ? match : `${prefix}${base}${url.replace(/^\.?\/+/, '')}"`,
  )
}

export async function fileExists(path: string) {
  try {
    await fs.access(path)
    return true
  } catch {
    return false
  }
}
