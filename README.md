# ncdai/react-primitives

Unstyled React primitives, published one package per component.

| Package                                                      | Description                                  |
| ------------------------------------------------------------ | -------------------------------------------- |
| [`@ncdai/react-swipe-actions`](packages/react-swipe-actions) | Swipe a row in a list to reveal actions on the left or right |

Styled versions built on these primitives live in the
[chanhdai.com registry](https://chanhdai.com/components).

## Docs

`apps/docs` is a [Fumadocs](https://fumadocs.dev) site. Content lives in
`content/docs` as MDX; the sidebar, search and table of contents come from the
page tree, so adding a primitive means adding one MDX file.

The primitives ship no CSS, so each page also documents a styled component built
on top. Those snippets are read from `src/` at build time, which keeps them in
step with the demo running above them.

```bash
pnpm dev
```

## Development

```bash
pnpm install
pnpm build
pnpm check-types
pnpm lint
```

## Releasing

Versioning and publishing go through [Changesets](https://github.com/changesets/changesets);
each package is versioned independently.

```bash
pnpm changeset          # describe the change
pnpm version-packages   # apply versions and changelogs
pnpm release            # build and publish
```

## License

MIT © [ncdai](https://chanhdai.com)
