import { createMDX } from "fumadocs-mdx/next"

const withMDX = createMDX()

/** @type {import('next').NextConfig} */
const config = {
  transpilePackages: ["@ncdai/react-swipe-actions"],
  // Serve any page as plain Markdown at <page>.mdx
  async rewrites() {
    return [
      {
        source: "/:path*.mdx",
        destination: "/md/:path*",
      },
    ]
  },
}

export default withMDX(config)
