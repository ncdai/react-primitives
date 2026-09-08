import { rehypeCodeDefaultOptions } from "fumadocs-core/mdx-plugins"
import { defineConfig } from "fumadocs-mdx/config"

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      ...rehypeCodeDefaultOptions,
      themes: {
        light: "github-light-default",
        dark: "vesper",
      },
    },
  },
})
