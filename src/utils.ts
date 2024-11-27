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

export async function fileExists(path: string) {
  try {
    await fs.access(path)
    return true
  } catch {
    return false
  }
}
