import defaultMdxComponents from "fumadocs-ui/mdx"
import type { MDXComponents } from "mdx/types"

import { SwipeActionsDemo } from "@/components/swipe-actions-demo"

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    SwipeActionsDemo,
    ...components,
  } satisfies MDXComponents
}

export const useMDXComponents = getMDXComponents

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>
}
