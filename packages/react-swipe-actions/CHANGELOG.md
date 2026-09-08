# @ncdai/react-swipe-actions

## 0.1.1

### Patch Changes

- d4cf5e5: Clip the item with `overflow: clip` instead of `overflow: hidden`, so a row is
  never a scroll container. With `hidden`, an open row had scrollable overflow that
  focus or `scrollIntoView` could scroll to, leaving the row stuck at an offset with
  no scrollbar to get back.

## 0.1.0

### Minor Changes

- 868be93: Initial release.

  Swipe a row in a list to reveal actions on the left or right.

  - Composable parts: `SwipeRoot`, `SwipeItem`, `SwipeActions`, `SwipeAction` and `SwipeContent`
  - A `render` prop on every part but `SwipeContent`, so a row can be an `li`, a `motion.li`, or anything else
  - Only one row open at a time inside a `SwipeRoot`
  - Dismisses on `Escape`, on a click outside, and optionally on scroll
  - Closed strips are `inert`, keeping their buttons out of the tab order and the accessibility tree
  - Respects `prefers-reduced-motion`
  - No CSS to import and no runtime dependencies
