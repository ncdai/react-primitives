---
"@ncdai/react-swipe-actions": minor
---

Rebuild the strip so a swipe never costs a reflow.

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
