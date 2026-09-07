import type { source } from "@/lib/source"

export async function getLLMText(page: (typeof source)["$inferPage"]) {
  const processed = await page.data.getText("processed")
  return `# ${page.data.title} (${page.url})\n\n${processed}`
}

/**
 * The route that serves a page as plain Markdown. `/<slug>.mdx` is a rewrite
 * onto `/md/<slug>`; the index has no slug, so it uses the route directly.
 */
export function getMarkdownUrl(url: string) {
  return url === "/" ? "/md" : `${url}.mdx`
}
