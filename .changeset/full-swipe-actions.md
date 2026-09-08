---
"@ncdai/react-swipe-actions": minor
---

Add full swipe, the way Mail does on iOS. Mark one action per side with
`fullSwipe` and dragging the row past `fullSwipeThreshold` (half the row width by
default) arms it: the action takes over the strip, and releasing runs it instead
of opening the row.

- `fullSwipe` on `SwipeAction`, `fullSwipeThreshold` on `SwipeItem`
- `data-armed` on the armed action and its strip
- Arming collapses the other actions and grows the `fullSwipe` one into their space
- A strip now stays hidden unless the drag goes its way, so the far strip no
  longer reappears once a full swipe uncovers the corner of the row it sits in
- Opt-in, so a side with no `fullSwipe` action behaves exactly as before
