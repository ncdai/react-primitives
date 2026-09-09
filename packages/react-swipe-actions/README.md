# React Swipe Actions

Swipe a row in a list to reveal actions on the left or right.

- Composable parts, no config props.
- Polymorphic `render` prop, so a row can be any element you want.
- Only one row open at a time.
- Full swipe runs the outermost action, the way Mail does on iOS.
- Keyboard, `Escape` and click-outside dismissal.
- Unstyled, with no CSS to import and no runtime dependencies.

→ Live demo: https://react-primitives.chanhdai.com/swipe-actions

## Install

```bash
npm i @ncdai/react-swipe-actions motion
```

## Usage

Paste this in and swipe the row. Classes are Tailwind; every part takes `style`
too.

```tsx
"use client"

import {
  SwipeAction,
  SwipeActionContent,
  SwipeActions,
  SwipeContent,
  SwipeItem,
  SwipeRoot,
} from "@ncdai/react-swipe-actions"

export function Example() {
  return (
    <SwipeRoot className="max-w-md overflow-clip rounded-xl border border-neutral-200 dark:border-neutral-800">
      <SwipeItem>
        <SwipeActions side="right" fullSwipe>
          <SwipeAction
            className="bg-amber-500 text-sm text-white"
            onClick={() => alert("Flagged")}
          >
            <SwipeActionContent className="w-20 items-center justify-center">
              Flag
            </SwipeActionContent>
          </SwipeAction>

          <SwipeAction
            className="bg-red-600 text-sm text-white"
            onClick={() => alert("Deleted")}
          >
            <SwipeActionContent className="w-20 items-center justify-center">
              Delete
            </SwipeActionContent>
          </SwipeAction>
        </SwipeActions>

        <SwipeContent className="bg-white p-4 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
          Namespaced registries
        </SwipeContent>
      </SwipeItem>
    </SwipeRoot>
  )
}
```

`SwipeRoot` is optional, it only makes sibling rows close one another. An item
takes one `SwipeActions` per side, and `render` swaps any part's element, so a
list is `<SwipeRoot render={<ul />}>` around `<SwipeItem render={<li />}>`.

## Styling

Everything is yours to style, with three rules:

- **Paint on `SwipeAction`, layout on `SwipeActionContent`.** The action covers
  the whole row, the content is the slice you see. That is what lets a full
  swipe flood it.
- **`SwipeContent` needs an opaque background.** It hides the actions while the
  row is closed.
- **`SwipeActionContent` needs a width.** It is measured to decide how far the
  row opens, so a zero-width one never shows.

## Parts

| Part                 | Renders      | `render` prop |
| -------------------- | ------------ | ------------- |
| `SwipeRoot`          | `div`        | yes           |
| `SwipeItem`          | `div`        | yes           |
| `SwipeActions`       | `div`        | yes           |
| `SwipeAction`        | `button`     | yes           |
| `SwipeActionContent` | `span`       | yes           |
| `SwipeContent`       | `motion.div` | no            |

Every part forwards `ref` and passes unknown props through.

### SwipeItem

| Prop                 | Default | Description                                                                             |
| -------------------- | ------- | --------------------------------------------------------------------------------------- |
| `threshold`          | `0.5`   | Fraction of the strip the drag must cross to snap open                                  |
| `velocityFactor`     | `0.2`   | Seconds of release velocity added to the position, so a flick opens without a full drag |
| `disabled`           | `false` | Turns the gesture off                                                                   |
| `closeOnScroll`      | `false` | Close on any scroll on the page                                                         |
| `fullSwipeThreshold` | `0.5`   | Fraction of the row width the drag must cross to arm a `fullSwipe` strip                |
| `onOpenChange`       |         | Called with `"closed"`, `"left"` or `"right"`                                           |

### SwipeActions

| Prop        | Default | Description                                                     |
| ----------- | ------- | --------------------------------------------------------------- |
| `side`      |         | `"left"` or `"right"`. Required                                 |
| `fullSwipe` | `false` | Let a drag across the row run the outermost action of the strip |

### SwipeAction

| Prop           | Default | Description                                  |
| -------------- | ------- | -------------------------------------------- |
| `closeOnClick` | `true`  | Close the row once the click handler has run |

## Data attributes

Style against these rather than tracking state yourself.

| Attribute       | On                            | Value                                          |
| --------------- | ----------------------------- | ---------------------------------------------- |
| `data-state`    | `SwipeItem`                   | `closed`, `left`, `right`                      |
| `data-disabled` | `SwipeItem`                   | present when disabled                          |
| `data-dragging` | `SwipeItem`, `SwipeContent`   | present while dragging                         |
| `data-side`     | `SwipeActions`                | `left`, `right`                                |
| `data-armed`    | `SwipeActions`, `SwipeAction` | present while a full swipe is armed            |
| `data-slot`     | every part                    | `swipe-root`, `swipe-item`, `swipe-actions`, … |

## Accessibility

- Closed actions are `inert`: out of the tab order, the accessibility tree and
  hit testing. Only the content is a hit target, never the rest of the action.
- With focus inside a row, `ArrowLeft` and `ArrowRight` move it one step in that
  direction and `Escape` closes it. The row needs focusable content to receive
  focus.
- Under `prefers-reduced-motion` the row snaps into place instead of animating.

## License

MIT © [ncdai](https://chanhdai.com)
