"use client"

import * as React from "react"
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  type HTMLMotionProps,
  type MotionValue,
  type PanInfo,
} from "motion/react"

import {
  mergeProps,
  useRender,
  type UseRenderComponentProps,
} from "./use-render"

export type SwipeSide = "left" | "right"

export type SwipeState = "closed" | SwipeSide

/* Geometry only. Paint — background, colours, cursor — is the consumer's. */

const ITEM_STYLE: React.CSSProperties = {
  position: "relative",
  isolation: "isolate",
  overflow: "hidden",
}

const ACTIONS_STYLE: React.CSSProperties = {
  position: "absolute",
  top: 0,
  bottom: 0,
  zIndex: 0,
  display: "flex",
}

const CONTENT_STYLE: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
}

const SNAP_SPRING = {
  type: "spring",
  stiffness: 500,
  damping: 45,
  mass: 0.8,
} as const

const GESTURE_SPRING = { ...SNAP_SPRING, damping: 36 } as const

/** Pixels of travel that turn a press into a drag. */
const DRAG_SLOP = 4

type SwipeRootContextValue = {
  register: (id: string, close: () => void) => () => void
  notifyOpen: (id: string) => void
}

const SwipeRootContext = React.createContext<SwipeRootContextValue | null>(null)

export type SwipeRootProps = UseRenderComponentProps<"div">

/**
 * Holds the list, and lets only one item stay open at a time. The registry
 * lives in a ref, so opening an item does not re-render its siblings.
 */
export function SwipeRoot({ render, ...props }: SwipeRootProps) {
  const registry = React.useRef(new Map<string, () => void>())

  const context = React.useMemo<SwipeRootContextValue>(
    () => ({
      register(id, close) {
        registry.current.set(id, close)
        return () => {
          registry.current.delete(id)
        }
      },
      notifyOpen(id) {
        for (const [key, close] of registry.current) {
          if (key !== id) close()
        }
      },
    }),
    []
  )

  const element = useRender({
    defaultTagName: "div",
    render,
    props: mergeProps<"div">({ "data-slot": "swipe-root" }, props),
  })

  return (
    <SwipeRootContext.Provider value={context}>
      {element}
    </SwipeRootContext.Provider>
  )
}

type DragHandler = (event: unknown, info: PanInfo) => void

type SwipeItemContextValue = {
  state: SwipeState
  disabled: boolean
  dragging: boolean
  x: MotionValue<number>
  leftWidth: number
  rightWidth: number
  /** Reported by each action strip, so the item knows where to snap. */
  setStripWidth: (side: SwipeSide, width: number) => void
  close: () => void
  onDragStart: () => void
  onDrag: DragHandler
  onDragEnd: DragHandler
  onClickCapture: (event: React.MouseEvent) => void
}

const SwipeItemContext = React.createContext<SwipeItemContextValue | null>(null)

function useSwipeItem() {
  const context = React.useContext(SwipeItemContext)
  if (!context) {
    throw new Error("Swipe parts must be used within SwipeItem")
  }
  return context
}

/** Mirrored onto the element as `data-state`, `data-disabled`, `data-dragging`. */
export type SwipeItemState = {
  state: SwipeState
  disabled: boolean
  dragging: boolean
}

export type SwipeItemProps = UseRenderComponentProps<"div", SwipeItemState> & {
  /**
   * Fraction of the action strip the drag must pass to snap open.
   * @defaultValue 0.5
   */
  threshold?: number
  /**
   * Seconds of velocity projected onto the release position, so a quick flick
   * opens the item without dragging all the way.
   * @defaultValue 0.2
   */
  velocityFactor?: number
  /** @defaultValue false */
  disabled?: boolean
  /**
   * Close the item on any scroll on the page.
   * @defaultValue false
   */
  closeOnScroll?: boolean
  onOpenChange?: (state: SwipeState) => void
}

export function SwipeItem({
  render,
  threshold = 0.5,
  velocityFactor = 0.2,
  disabled = false,
  closeOnScroll = false,
  onOpenChange,
  ...props
}: SwipeItemProps) {
  const id = React.useId()
  const group = React.useContext(SwipeRootContext)
  const shouldReduceMotion = useReducedMotion()

  const rootRef = React.useRef<HTMLDivElement>(null)
  const [widths, setWidths] = React.useState({ left: 0, right: 0 })

  const [state, setState] = React.useState<SwipeState>("closed")
  const [dragging, setDragging] = React.useState(false)
  const stateRef = React.useRef<SwipeState>("closed")
  const draggedRef = React.useRef(false)
  const x = useMotionValue(0)

  const setStripWidth = React.useCallback((side: SwipeSide, width: number) => {
    setWidths((prev) =>
      prev[side] === width ? prev : { ...prev, [side]: width }
    )
  }, [])

  const settle = React.useCallback(
    (next: SwipeState, releaseVelocity?: number) => {
      const target =
        next === "left" ? widths.left : next === "right" ? -widths.right : 0

      animate(
        x,
        target,
        shouldReduceMotion
          ? { duration: 0 }
          : releaseVelocity === undefined
            ? SNAP_SPRING
            : { ...GESTURE_SPRING, velocity: releaseVelocity }
      )

      if (next !== "closed") group?.notifyOpen(id)
      if (stateRef.current === next) return

      stateRef.current = next
      setState(next)
      onOpenChange?.(next)
    },
    [widths, x, shouldReduceMotion, group, id, onOpenChange]
  )

  const close = React.useCallback(() => settle("closed"), [settle])

  // Keep the close callback current without re-registering on every render.
  const closeRef = React.useRef(() => {})
  React.useEffect(() => {
    closeRef.current = close
  }, [close])

  React.useEffect(
    () => group?.register(id, () => closeRef.current()),
    [group, id]
  )

  // Stay pinned to the strip if it resizes while the item is open.
  React.useEffect(() => {
    if (stateRef.current === "left") x.set(widths.left)
    if (stateRef.current === "right") x.set(-widths.right)
  }, [widths, x])

  const handleDragStart = React.useCallback(() => {
    draggedRef.current = false
    setDragging(true)
    group?.notifyOpen(id)
  }, [group, id])

  const handleDrag = React.useCallback<DragHandler>((_, info) => {
    if (Math.abs(info.offset.x) > DRAG_SLOP) draggedRef.current = true
  }, [])

  const handleDragEnd = React.useCallback<DragHandler>(
    (_, info) => {
      setDragging(false)

      const projected = x.get() + info.velocity.x * velocityFactor

      if (widths.right > 0 && projected <= -widths.right * threshold) {
        settle("right", info.velocity.x)
      } else if (widths.left > 0 && projected >= widths.left * threshold) {
        settle("left", info.velocity.x)
      } else {
        settle("closed", info.velocity.x)
      }
    },
    [x, velocityFactor, widths, threshold, settle]
  )

  // Swallow the click that ends a drag, and let a click on an open item close it.
  const handleClickCapture = React.useCallback(
    (event: React.MouseEvent) => {
      if (!draggedRef.current && stateRef.current === "closed") return

      event.preventDefault()
      event.stopPropagation()

      if (draggedRef.current) {
        draggedRef.current = false
        return
      }
      close()
    },
    [close]
  )

  React.useEffect(() => {
    if (state === "closed") return

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) closeRef.current()
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current()
    }
    const handleScroll = () => closeRef.current()

    document.addEventListener("pointerdown", handlePointerDown, true)
    document.addEventListener("keydown", handleEscape)
    if (closeOnScroll) window.addEventListener("scroll", handleScroll, true)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true)
      document.removeEventListener("keydown", handleEscape)
      if (closeOnScroll) {
        window.removeEventListener("scroll", handleScroll, true)
      }
    }
  }, [state, closeOnScroll])

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return

      // Arrows move the content, so ArrowLeft either pushes an open left strip
      // away or slides left to reveal the right one.
      const [closes, opens] =
        event.key === "ArrowLeft"
          ? (["left", "right"] as const)
          : (["right", "left"] as const)

      if (stateRef.current === closes) settle("closed")
      else if (widths[opens] > 0) settle(opens)
      else return

      event.preventDefault()
    },
    [disabled, widths, settle]
  )

  const itemState = React.useMemo<SwipeItemState>(
    () => ({ state, disabled, dragging }),
    [state, disabled, dragging]
  )

  const context = React.useMemo<SwipeItemContextValue>(
    () => ({
      state,
      disabled,
      dragging,
      x,
      leftWidth: widths.left,
      rightWidth: widths.right,
      setStripWidth,
      close,
      onDragStart: handleDragStart,
      onDrag: handleDrag,
      onDragEnd: handleDragEnd,
      onClickCapture: handleClickCapture,
    }),
    [
      state,
      disabled,
      dragging,
      x,
      widths,
      setStripWidth,
      close,
      handleDragStart,
      handleDrag,
      handleDragEnd,
      handleClickCapture,
    ]
  )

  const element = useRender({
    defaultTagName: "div",
    render,
    state: itemState,
    props: mergeProps<"div">(
      {
        "data-slot": "swipe-item",
        ref: rootRef,
        style: ITEM_STYLE,
        onKeyDown: handleKeyDown,
      },
      props
    ),
  })

  return (
    <SwipeItemContext.Provider value={context}>
      {element}
    </SwipeItemContext.Provider>
  )
}

export type SwipeActionsProps = UseRenderComponentProps<"div"> & {
  side: SwipeSide
}

export function SwipeActions({ render, side, ...props }: SwipeActionsProps) {
  const { state, setStripWidth } = useSwipeItem()
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const element = ref.current
    if (!element) return

    // ResizeObserver reports the initial size as soon as it starts observing.
    const observer = new ResizeObserver(() =>
      setStripWidth(side, element.offsetWidth)
    )
    observer.observe(element)

    return () => {
      observer.disconnect()
      setStripWidth(side, 0)
    }
  }, [side, setStripWidth])

  return useRender({
    defaultTagName: "div",
    render,
    props: mergeProps<"div">(
      {
        "data-slot": "swipe-actions",
        "data-side": side,
        ref,
        style: { ...ACTIONS_STYLE, [side]: 0 },
        // Closed, the strip sits under the content: keep it out of the
        // accessibility tree, the tab order and hit testing.
        inert: state !== side,
      },
      props
    ),
  })
}

export type SwipeActionProps = UseRenderComponentProps<"button"> & {
  /**
   * Close the item once the click handler has run.
   * @defaultValue true
   */
  closeOnClick?: boolean
}

export function SwipeAction({
  render,
  closeOnClick = true,
  ...props
}: SwipeActionProps) {
  const { close } = useSwipeItem()

  return useRender({
    defaultTagName: "button",
    render,
    props: mergeProps<"button">(
      {
        "data-slot": "swipe-action",
        type: "button",
        onClick: () => {
          if (closeOnClick) close()
        },
      },
      props
    ),
  })
}

export type SwipeContentProps = HTMLMotionProps<"div">

export function SwipeContent({ style, ...props }: SwipeContentProps) {
  const { x, disabled, dragging, leftWidth, rightWidth, ...handlers } =
    useSwipeItem()

  return (
    <motion.div
      data-slot="swipe-content"
      // Spread first: the drag wiring below is owned by the component.
      {...props}
      data-dragging={dragging || undefined}
      style={{ ...CONTENT_STYLE, ...style, x }}
      drag={disabled ? false : "x"}
      dragConstraints={{ left: -rightWidth, right: leftWidth }}
      dragElastic={0.2}
      dragMomentum={false}
      onDragStart={handlers.onDragStart}
      onDrag={handlers.onDrag}
      onDragEnd={handlers.onDragEnd}
      onClickCapture={handlers.onClickCapture}
    />
  )
}
