import { createElement } from "react"
import { loader } from "fumadocs-core/source"
import { defineDocs } from "fumadocs-mdx/macro"

import { SwipeActionsIcon } from "@/components/icons"

const docs = defineDocs({
  dir: "content/docs",
  docs: {
    // Required by getText("processed"), which feeds llms.txt and the .mdx routes.
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
})

const icons = {
  SwipeActions: SwipeActionsIcon,
}

export const source = loader({
  baseUrl: "/",
  icon(name) {
    if (name && name in icons) {
      return createElement(icons[name as keyof typeof icons])
    }
  },
  source: docs.toFumadocsSource(),
})
