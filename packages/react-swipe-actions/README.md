# React Swipe Actions

Swipe a row in a list to reveal actions on the left or right.

- Composable parts, no config props.
- Polymorphic `render` prop, so a row can be any element you want.
- Only one row open at a time.
- Keyboard, `Escape` and click-outside dismissal.
- Unstyled, with no CSS to import and no runtime dependencies.

→ Live demo: https://primitives.chanhdai.com/swipe-actions

## Install

```bash
npm i @ncdai/react-swipe-actions motion
```

`react` and `motion` are peer dependencies.

## Usage

```tsx
import {
  SwipeAction,
  SwipeActions,
  SwipeContent,
  SwipeItem,
  SwipeRoot,
} from "@ncdai/react-swipe-actions"

function Inbox({ mails }: { mails: Mail[] }) {
  return (
    <SwipeRoot render={<ul />}>
      {mails.map((mail) => (
        <SwipeItem key={mail.id} render={<li />}>
          <SwipeActions side="left">
            <SwipeAction onClick={() => archive(mail.id)}>Archive</SwipeAction>
          </SwipeActions>

          <SwipeActions side="right">
            <SwipeAction onClick={() => remove(mail.id)}>Delete</SwipeAction>
          </SwipeActions>

          <SwipeContent>{mail.subject}</SwipeContent>
        </SwipeItem>
      ))}
    </SwipeRoot>
  )
}
```

`SwipeRoot` is optional. It only makes sibling rows close one another, so a
lone `SwipeItem` works on its own.

## Styling

The package positions the strips behind the content and makes the content
draggable. Everything else is yours. Two things it cannot do for you:

- **Give `SwipeContent` an opaque background.** It is what hides the strips
  while the row is closed.
- **Give `SwipeAction` a width.** The strip is measured to decide how far the
  row opens, so zero-width actions never appear.

Enough to get a usable row, with Tailwind:

```tsx
<SwipeRoot render={<ul />} className="divide-y border-y">
  <SwipeItem render={<li />}>
    <SwipeActions side="right">
      <SwipeAction
        className="w-20 bg-red-600 text-sm text-white"
        onClick={() => remove(mail.id)}
      >
        Delete
      </SwipeAction>
    </SwipeActions>

    <SwipeContent className="bg-white p-4 dark:bg-zinc-950">
      {mail.subject}
    </SwipeContent>
  </SwipeItem>
</SwipeRoot>
```

## Parts

| Part           | Renders      | `render` prop |
| -------------- | ------------ | ------------- |
| `SwipeRoot`    | `div`        | yes           |
| `SwipeItem`    | `div`        | yes           |
| `SwipeActions` | `div`        | yes           |
| `SwipeAction`  | `button`     | yes           |
| `SwipeContent` | `motion.div` | no            |

`SwipeActions`, `SwipeAction` and `SwipeContent` must live inside a
`SwipeItem`. Every part forwards `ref` and passes unknown props through.

### SwipeItem

| Prop             | Default | Description                                                                             |
| ---------------- | ------- | --------------------------------------------------------------------------------------- |
| `threshold`      | `0.5`   | Fraction of the strip the drag must cross to snap open                                  |
| `velocityFactor` | `0.2`   | Seconds of release velocity added to the position, so a flick opens without a full drag |
| `disabled`       | `false` | Turns the gesture off                                                                   |
| `closeOnScroll`  | `false` | Close on any scroll on the page                                                         |
| `onOpenChange`   |         | Called with `"closed"`, `"left"` or `"right"`                                           |

### SwipeActions

| Prop   | Description                     |
| ------ | ------------------------------- |
| `side` | `"left"` or `"right"`. Required |

### SwipeAction

| Prop           | Default | Description                                  |
| -------------- | ------- | -------------------------------------------- |
| `closeOnClick` | `true`  | Close the row once the click handler has run |

## Data attributes

Style against these rather than tracking state yourself.

| Attribute       | On                          | Value                                          |
| --------------- | --------------------------- | ---------------------------------------------- |
| `data-state`    | `SwipeItem`                 | `closed`, `left`, `right`                      |
| `data-disabled` | `SwipeItem`                 | present when disabled                          |
| `data-dragging` | `SwipeItem`, `SwipeContent` | present while dragging                         |
| `data-side`     | `SwipeActions`              | `left`, `right`                                |
| `data-slot`     | every part                  | `swipe-root`, `swipe-item`, `swipe-actions`, … |

## Accessibility

- Closed strips are `inert`, so their buttons stay out of the tab order, the
  accessibility tree and hit testing.
- With focus inside a row, `ArrowLeft` and `ArrowRight` move it one step in that
  direction and `Escape` closes it. Focusable row content is what carries focus
  there.
- Under `prefers-reduced-motion` the row snaps into place instead of animating.

## License

MIT © [ncdai](https://chanhdai.com)
