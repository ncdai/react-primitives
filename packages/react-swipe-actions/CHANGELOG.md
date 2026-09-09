# @ncdai/react-swipe-actions

## 0.3.0

### Minor Changes

- 9a37811: Rebuild the strip so a swipe never costs a reflow.

  Each action is now a panel that covers the whole item and shows only the slice
  its content occupies, because the panels are stacked and each paints over the
  one before it. A full swipe slides them together instead of resizing anything,
  so the gesture only ever writes `transform`.

  Measured on a throttled CPU, dragging past the natural strip width went from 5-6
  late frames to none; what is left is the one re-render when the swipe arms.

  Breaking: `fullSwipe` moves from `SwipeAction` to `SwipeActions` and applies to
  the outermost action, which is where iOS puts it. The takeover is that action
  covering the others, so an inner one cannot do it.

  Breaking: an action's visible slice is now its own part, `SwipeActionContent`.
  `SwipeAction` covers the row and takes the paint; the content takes the layout,
  and its width is what decides how far the row opens. Nothing is wrapped for you,
  so the DOM matches what you wrote.

## 0.2.0

### Minor Changes

- 857c261: Add full swipe, the way Mail does on iOS. Mark one action per side with
  `fullSwipe` and dragging the row past `fullSwipeThreshold` (half the row width by
  default) arms it: the action takes over the strip, and releasing runs it instead
  of opening the row.

  - `fullSwipe` on `SwipeAction`, `fullSwipeThreshold` on `SwipeItem`
  - `data-armed` on the armed action and its strip
  - Arming collapses the other actions and grows the `fullSwipe` one into their space
  - A strip now stays hidden unless the drag goes its way, so the far strip no
    longer reappears once a full swipe uncovers the corner of the row it sits in
  - Opt-in, so a side with no `fullSwipe` action behaves exactly as before

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
