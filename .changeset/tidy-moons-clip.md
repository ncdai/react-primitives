---
"@ncdai/react-swipe-actions": patch
---

Clip the item with `overflow: clip` instead of `overflow: hidden`, so a row is
never a scroll container. With `hidden`, an open row had scrollable overflow that
focus or `scrollIntoView` could scroll to, leaving the row stuck at an offset with
no scrollbar to get back.
