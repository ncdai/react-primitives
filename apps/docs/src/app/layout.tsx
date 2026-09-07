import type { Metadata } from "next"
import { RootProvider } from "fumadocs-ui/provider/next"

import { fontVariables } from "@/lib/fonts"

import "./globals.css"

export const metadata: Metadata = {
  metadataBase: new URL("https://primitives.chanhdai.com"),
  title: {
    default: "ncdai/react-primitives",
    template: "%s – ncdai/react-primitives",
  },
  description: "Unstyled React primitives by ncdai. Bring your own styles.",
  icons: {
    icon: [
      {
        url: "https://assets.chanhdai.com/images/favicon.ico",
        sizes: "32x32",
      },
      {
        url: "https://assets.chanhdai.com/images/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "https://assets.chanhdai.com/images/favicon-dark.svg",
        sizes: "any",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    apple: {
      url: "https://assets.chanhdai.com/images/apple-touch-icon.png",
      type: "image/png",
      sizes: "180x180",
    },
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <body className="flex min-h-svh flex-col antialiased">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  )
}
