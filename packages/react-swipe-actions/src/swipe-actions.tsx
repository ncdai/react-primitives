"use client"

import * as React from "react"
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
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
  overflow: "clip",
}

/* The strip parks just outside the item and slides in with the content. */
const ACTIONS_STYLE: React.CSSProperties = {
  position: "absolute",
  top: 0,
  bottom: 0,
  width: "100%",
  zIndex: 0,
}

/**
 * An action covers the whole item and shows only the slice its content occupies,
 * because the actions are stacked and each one paints over the one before it.
 * A full swipe then only has to slide them together: nothing resizes.
 */
const PANEL_STYLE: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  // Only the content is a target; the rest of the action is just paint.
  pointerEvents: "none",
}

const ACTION_CONTENT_STYLE: React.CSSProperties = {
  display: "flex",
  pointerEvents: "auto",
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

const TAKEOVER_TWEEN = { duration: 0.18, ease: [0.32, 0.72, 0, 1] } as const

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
  /** Drives the full-swipe takeover: 1 keeps the strip spread, 0 stacks it. */
  collapse: MotionValue<number>
  leftWidth: number
  rightWidth: number
  itemWidth: number
  /** Side whose full-swipe action fires on release. */
  armed: SwipeSide | null
  fullSwipeSides: Record<SwipeSide, boolean>
  /** Summed from the action contents, so the item knows where to snap. */
  setStripWidth: (side: SwipeSide, width: number) => void
  registerFullSwipe: (side: SwipeSide, run: () => void) => () => void
  close: () => void
  onDragStart: () => void
  onDrag: DragHandler
  onDragEnd: DragHandler
  onClickCapture: (event: React.MouseEvent) => void
}

const SwipeItemContext = React.createContext<SwipeItemContextValue | null>(null)

type SwipeActionsContextValue = {
  side: SwipeSide
  fullSwipe: boolean
  /** Registration order is mount order, which is DOM order. */
  measure: (id: string, width: number) => void
  forget: (id: string) => void
  /** How far into the strip this action's content starts. */
  offsetOf: (id: string) => number
  /** The outermost action, the one a full swipe runs. */
  isOutermost: (id: string) => boolean
}

const SwipeActionsContext =
  React.createContext<SwipeActionsContextValue | null>(null)

const SwipeActionContext = React.createContext<string | null>(null)

function useSwipeActionId() {
  const id = React.useContext(SwipeActionContext)
  if (!id) {
    throw new Error("SwipeActionContent must be used within SwipeAction")
  }
  return id
}

function useSwipeActions() {
  const context = React.useContext(SwipeActionsContext)
  if (!context) {
    throw new Error("SwipeAction must be used within SwipeActions")
  }
  return context
}

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
   * Fraction of the item width the drag must pass for the side's `fullSwipe`
   * action to arm, firing on release instead of opening the item.
   * @defaultValue 0.5
   */
  fullSwipeThreshold?: number
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
  fullSwipeThreshold = 0.5,
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
  const [itemWidth, setItemWidth] = React.useState(0)

  const [armed, setArmed] = React.useState<SwipeSide | null>(null)
  const armedRef = React.useRef<SwipeSide | null>(null)
  const runFullSwipe = React.useRef<Partial<Record<SwipeSide, () => void>>>({})
  const [fullSwipeSides, setFullSwipeSides] = React.useState({
    left: false,
    right: false,
  })

  const [state, setState] = React.useState<SwipeState>("closed")
  const [dragging, setDragging] = React.useState(false)
  const stateRef = React.useRef<SwipeState>("closed")
  const draggedRef = React.useRef(false)
  const x = useMotionValue(0)
  const collapse = useMotionValue(1)

  const setStripWidth = React.useCallback((side: SwipeSide, width: number) => {
    setWidths((prev) =>
      prev[side] === width ? prev : { ...prev, [side]: width }
    )
  }, [])

  const registerFullSwipe = React.useCallback(
    (side: SwipeSide, run: () => void) => {
      runFullSwipe.current[side] = run
      setFullSwipeSides((prev) => ({ ...prev, [side]: true }))

      return () => {
        delete runFullSwipe.current[side]
        setFullSwipeSides((prev) => ({ ...prev, [side]: false }))
      }
    },
    []
  )

  const setArmedSide = React.useCallback((next: SwipeSide | null) => {
    if (armedRef.current === next) return
    armedRef.current = next
    setArmed(next)
  }, [])

  // animate() retargets from the current value, so crossing the threshold back
  // and forth stays continuous.
  React.useEffect(() => {
    animate(
      collapse,
      armed ? 0 : 1,
      shouldReduceMotion ? { duration: 0 } : TAKEOVER_TWEEN
    )
  }, [armed, collapse, shouldReduceMotion])

  // ResizeObserver reports the initial size as soon as it starts observing.
  React.useEffect(() => {
    const element = rootRef.current
    if (!element) return

    const observer = new ResizeObserver(() => setItemWidth(element.offsetWidth))
    observer.observe(element)

    return () => observer.disconnect()
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

  const handleDrag = React.useCallback<DragHandler>(
    (_, info) => {
      if (Math.abs(info.offset.x) > DRAG_SLOP) draggedRef.current = true

      const reach = fullSwipeThreshold * itemWidth
      const travel = x.get()

      if (reach <= 0) return
      if (travel <= -reach && runFullSwipe.current.right) setArmedSide("right")
      else if (travel >= reach && runFullSwipe.current.left)
        setArmedSide("left")
      else setArmedSide(null)
    },
    [x, fullSwipeThreshold, itemWidth, setArmedSide]
  )

  const handleDragEnd = React.useCallback<DragHandler>(
    (_, info) => {
      setDragging(false)

      const side = armedRef.current
      if (side) {
        setArmedSide(null)
        // The synthetic click below is ours, not the tail of the gesture.
        draggedRef.current = false
        runFullSwipe.current[side]?.()
        settle("closed", info.velocity.x)
        return
      }

      const projected = x.get() + info.velocity.x * velocityFactor

      if (widths.right > 0 && projected <= -widths.right * threshold) {
        settle("right", info.velocity.x)
      } else if (widths.left > 0 && projected >= widths.left * threshold) {
        settle("left", info.velocity.x)
      } else {
        settle("closed", info.velocity.x)
      }
    },
    [x, velocityFactor, widths, threshold, settle, setArmedSide]
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
      collapse,
      leftWidth: widths.left,
      rightWidth: widths.right,
      itemWidth,
      armed,
      fullSwipeSides,
      setStripWidth,
      registerFullSwipe,
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
      collapse,
      widths,
      itemWidth,
      armed,
      fullSwipeSides,
      setStripWidth,
      registerFullSwipe,
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
  /**
   * Let a drag past `fullSwipeThreshold` run the outermost action, the way Mail
   * does on iOS. The takeover works by that action covering the others, so it
   * is always the outermost one, as it is on the platform.
   * @defaultValue false
   */
  fullSwipe?: boolean
}

export function SwipeActions({
  render,
  side,
  fullSwipe = false,
  ...props
}: SwipeActionsProps) {
  const { state, armed, x, setStripWidth } = useSwipeItem()
  const ref = React.useRef<HTMLDivElement>(null)

  // Content widths in mount order, which is the order they sit in the strip.
  const [contents, setContents] = React.useState<
    { id: string; width: number }[]
  >([])

  const measure = React.useCallback((id: string, width: number) => {
    setContents((prev) => {
      const at = prev.findIndex((content) => content.id === id)
      if (at === -1) return [...prev, { id, width }]
      if (prev[at].width === width) return prev
      const next = [...prev]
      next[at] = { id, width }
      return next
    })
  }, [])

  const forget = React.useCallback((id: string) => {
    setContents((prev) => prev.filter((content) => content.id !== id))
  }, [])

  const offsetOf = React.useCallback(
    (id: string) => {
      let offset = 0
      for (const content of contents) {
        if (content.id === id) break
        offset += content.width
      }
      return offset
    },
    [contents]
  )

  const total = contents.reduce((sum, content) => sum + content.width, 0)

  React.useEffect(() => {
    setStripWidth(side, total)
    return () => setStripWidth(side, 0)
  }, [side, total, setStripWidth])

  // The strip is parked just outside the item, so tracking the content edge is
  // the whole of its movement.
  useMotionValueEvent(x, "change", (value) => {
    const element = ref.current
    if (!element) return
    element.style.transform = `translate3d(${Math.round(value)}px, 0, 0)`
  })

  const isOutermost = React.useCallback(
    (id: string) =>
      contents.length > 0 && contents[contents.length - 1].id === id,
    [contents]
  )

  const context = React.useMemo<SwipeActionsContextValue>(
    () => ({ side, fullSwipe, measure, forget, offsetOf, isOutermost }),
    [side, fullSwipe, measure, forget, offsetOf, isOutermost]
  )

  const element = useRender({
    defaultTagName: "div",
    render,
    props: mergeProps<"div">(
      {
        "data-slot": "swipe-actions",
        "data-side": side,
        "data-armed": armed === side ? "" : undefined,
        ref,
        style: {
          ...ACTIONS_STYLE,
          [side === "left" ? "right" : "left"]: "100%",
        },
        // Closed, the strip sits under the content: keep it out of the
        // accessibility tree, the tab order and hit testing.
        inert: state !== side,
      },
      props
    ),
  })

  return (
    <SwipeActionsContext.Provider value={context}>
      {element}
    </SwipeActionsContext.Provider>
  )
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
  const {
    close,
    armed,
    x,
    collapse,
    leftWidth,
    rightWidth,
    registerFullSwipe,
  } = useSwipeItem()
  const { side, fullSwipe, offsetOf, isOutermost } = useSwipeActions()
  const id = React.useId()
  const ref = React.useRef<HTMLButtonElement>(null)

  const primary = fullSwipe && isOutermost(id)

  React.useEffect(() => {
    if (!primary) return

    // Dispatching a real click keeps one path to the handler, so a full swipe
    // and a tap are the same event to the consumer.
    return registerFullSwipe(side, () => {
      ref.current?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true })
      )
    })
  }, [primary, side, registerFullSwipe])

  const before = offsetOf(id)

  // Transform only, so a drag never costs a reflow.
  const place = React.useCallback(() => {
    const element = ref.current
    if (!element) return

    const total = side === "left" ? leftWidth : rightWidth
    const travel = Math.max(0, side === "left" ? x.get() : -x.get())
    const spread = collapse.get()

    // Past the natural width the contents stay put and the outermost action's
    // panel fills the rest, which is what makes a full swipe read as a flood.
    const progress = total > 0 ? Math.min(1, travel / total) : 0
    const offset = before * progress * spread * (side === "left" ? -1 : 1)

    element.style.transform = `translate3d(${offset.toFixed(2)}px, 0, 0)`
  }, [before, side, leftWidth, rightWidth, x, collapse])

  useMotionValueEvent(x, "change", place)
  useMotionValueEvent(collapse, "change", place)
  React.useEffect(place, [place])

  const element = useRender({
    defaultTagName: "button",
    render,
    props: mergeProps<"button">(
      {
        "data-slot": "swipe-action",
        "data-armed": armed === side && primary ? "" : undefined,
        ref,
        type: "button",
        style: {
          ...PANEL_STYLE,
          justifyContent: side === "left" ? "flex-end" : "flex-start",
        },
        onClick: () => {
          if (closeOnClick) close()
        },
      },
      props
    ),
  })

  return (
    <SwipeActionContext.Provider value={id}>
      {element}
    </SwipeActionContext.Provider>
  )
}

export type SwipeActionContentProps = UseRenderComponentProps<"span">

/**
 * The visible slice of an action. Its width is what the item measures, so the
 * action it sits in can cover the row without changing how far the row opens.
 */
export function SwipeActionContent({
  render,
  ...props
}: SwipeActionContentProps) {
  const { measure, forget } = useSwipeActions()
  const id = useSwipeActionId()
  const ref = React.useRef<HTMLSpanElement>(null)

  React.useEffect(() => {
    const element = ref.current
    if (!element) return

    // ResizeObserver reports the initial size as soon as it starts observing.
    const observer = new ResizeObserver(() => measure(id, element.offsetWidth))
    observer.observe(element)

    return () => {
      observer.disconnect()
      forget(id)
    }
  }, [id, measure, forget])

  return useRender({
    defaultTagName: "span",
    render,
    props: mergeProps<"span">(
      { "data-slot": "swipe-action-content", ref, style: ACTION_CONTENT_STYLE },
      props
    ),
  })
}

export type SwipeContentProps = HTMLMotionProps<"div">

export function SwipeContent({ style, ...props }: SwipeContentProps) {
  const {
    x,
    disabled,
    dragging,
    leftWidth,
    rightWidth,
    itemWidth,
    fullSwipeSides,
    ...handlers
  } = useSwipeItem()

  return (
    <motion.div
      data-slot="swipe-content"
      // Spread first: the drag wiring below is owned by the component.
      {...props}
      data-dragging={dragging || undefined}
      style={{ ...CONTENT_STYLE, ...style, x }}
      drag={disabled ? false : "x"}
      dragConstraints={{
        left: -(fullSwipeSides.right ? itemWidth : rightWidth),
        right: fullSwipeSides.left ? itemWidth : leftWidth,
      }}
      dragElastic={0.2}
      dragMomentum={false}
      onDragStart={handlers.onDragStart}
      onDrag={handlers.onDrag}
      onDragEnd={handlers.onDragEnd}
      onClickCapture={handlers.onClickCapture}
    />
  )
}
