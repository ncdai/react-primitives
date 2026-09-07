import { loader } from "fumadocs-core/source"
import { defineDocs } from "fumadocs-mdx/macro"

const docs = defineDocs({
  dir: "content/docs",
  docs: {
    // Required by getText("processed"), which feeds llms.txt and the .mdx routes.
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
})

export const source = loader({
  baseUrl: "/",
  source: docs.toFumadocsSource(),
})
