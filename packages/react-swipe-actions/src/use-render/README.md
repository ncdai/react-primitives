# use-render

Internal polymorphic-render helper (`useRender`, `mergeProps`, `composeRefs`)
that powers the `render` prop on these primitives. It lets a component render as
a custom element while merging the primitive's props, refs and state attributes
onto it.

## Attribution

Adapted from [Base UI](https://github.com/mui/base-ui)'s `useRender`
(`@base-ui/react/use-render`), MIT licensed, © MUI, by way of
[`@shadcn/react`](https://github.com/shadcn-ui/ui/tree/main/packages/react/src/use-render),
MIT licensed, © shadcn.

A local copy is kept so the primitives have no runtime dependency on Base UI.
Importing `@base-ui/react` for these two helpers alone costs 9.2 MB of install
weight and five transitive dependencies.

If Base UI publishes `useRender` as an independent package, switch to it and
delete this copy.

## Differences from Base UI

- Event handlers compose with `event.defaultPrevented` rather than Base UI's
  `event.preventBaseUIHandler()`.
- `mergeProps` merges refs; Base UI's leaves them to `useRender`'s `ref` option.
- State keys become kebab-case data attributes (`isActive` -> `data-is-active`);
  Base UI lowercases them (`data-isactive`).
- The `slot` state key is special-cased to `data-slot`.
