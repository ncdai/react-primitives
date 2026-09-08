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
  leftWidth: number
  rightWidth: number
  itemWidth: number
  /** Side whose full-swipe action fires on release. */
  armed: SwipeSide | null
  fullSwipeSides: Record<SwipeSide, boolean>
  /** Reported by each action strip, so the item knows where to snap. */
  setStripWidth: (side: SwipeSide, width: number) => void
  registerFullSwipe: (side: SwipeSide, run: () => void) => () => void
  close: () => void
  onDragStart: () => void
  onDrag: DragHandler
  onDragEnd: DragHandler
  onClickCapture: (event: React.MouseEvent) => void
}

const SwipeItemContext = React.createContext<SwipeItemContextValue | null>(null)

const SwipeActionsContext = React.createContext<SwipeSide | null>(null)

function useSwipeSide() {
  const side = React.useContext(SwipeActionsContext)
  if (!side) {
    throw new Error("SwipeAction must be used within SwipeActions")
  }
  return side
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
}

export function SwipeActions({ render, side, ...props }: SwipeActionsProps) {
  const {
    state,
    armed,
    x,
    leftWidth,
    rightWidth,
    fullSwipeSides,
    setStripWidth,
  } = useSwipeItem()
  const ref = React.useRef<HTMLDivElement>(null)

  const fullSwipe = fullSwipeSides[side]
  const natural = side === "left" ? leftWidth : rightWidth

  React.useEffect(() => {
    const element = ref.current
    if (!element) return

    // ResizeObserver reports the initial size as soon as it starts observing.
    const observer = new ResizeObserver(() => {
      // Ignore the widths written below, so `natural` stays the natural one.
      if (element.style.width) return
      setStripWidth(side, element.offsetWidth)
    })
    observer.observe(element)

    return () => {
      observer.disconnect()
      setStripWidth(side, 0)
    }
  }, [side, setStripWidth])

  useMotionValueEvent(x, "change", (value) => {
    const element = ref.current
    if (!element) return

    const travel = side === "left" ? value : -value

    // A strip only ever belongs to its own direction. Without this the far
    // strip reappears once the drag uncovers the corner of the row it sits in.
    const visibility = travel > 0 ? "" : "hidden"
    if (element.style.visibility !== visibility) {
      element.style.visibility = visibility
    }

    // Grow past the natural width so the strip keeps up with the content edge.
    // Width is a layout property, so only write it when the value really moves.
    if (!fullSwipe) return
    const width = travel > natural ? `${Math.round(travel)}px` : ""
    if (element.style.width !== width) {
      element.style.width = width
    }
  })

  const element = useRender({
    defaultTagName: "div",
    render,
    props: mergeProps<"div">(
      {
        "data-slot": "swipe-actions",
        "data-side": side,
        "data-armed": armed === side ? "" : undefined,
        ref,
        style: { ...ACTIONS_STYLE, [side]: 0 },
        // Closed, the strip sits under the content: keep it out of the
        // accessibility tree, the tab order and hit testing.
        inert: state !== side,
      },
      props
    ),
  })

  return (
    <SwipeActionsContext.Provider value={side}>
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
  /**
   * Run this action when the item is dragged past `fullSwipeThreshold`, the way
   * Mail does on iOS. One action per side; it takes over the strip once armed.
   * @defaultValue false
   */
  fullSwipe?: boolean
}

export function SwipeAction({
  render,
  closeOnClick = true,
  fullSwipe = false,
  ...props
}: SwipeActionProps) {
  const { close, armed, registerFullSwipe } = useSwipeItem()
  const side = useSwipeSide()
  const shouldReduceMotion = useReducedMotion()
  const ref = React.useRef<HTMLButtonElement>(null)
  const naturalWidth = React.useRef(0)

  React.useEffect(() => {
    if (!fullSwipe) return

    // Dispatching a real click keeps one path to the handler, so a full swipe
    // and a tap are the same event to the consumer.
    return registerFullSwipe(side, () => {
      ref.current?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true })
      )
    })
  }, [fullSwipe, side, registerFullSwipe])

  const isArmed = armed === side
  const collapsed = isArmed && !fullSwipe

  // Width has to be measured: it cannot tween from auto.
  React.useEffect(() => {
    const element = ref.current
    if (!element || fullSwipe) return

    if (collapsed) {
      // Continue from where it is, so re-arming mid-restore does not snap back
      // out to full width first.
      const from = element.offsetWidth
      if (!element.style.width) naturalWidth.current = from

      element.style.boxSizing = "border-box"
      element.style.overflow = "clip"
      element.style.minWidth = "0"
      // border-box still floors the box at its own padding.
      element.style.paddingInline = "0"

      const controls = animate(
        element,
        { width: [from, 0] },
        shouldReduceMotion ? { duration: 0 } : TAKEOVER_TWEEN
      )
      return () => controls.stop()
    }

    if (naturalWidth.current === 0) return

    const controls = animate(
      element,
      { width: [element.offsetWidth, naturalWidth.current] },
      shouldReduceMotion ? { duration: 0 } : TAKEOVER_TWEEN
    )
    controls.then(() => {
      element.style.width = ""
      element.style.boxSizing = ""
      element.style.overflow = ""
      element.style.minWidth = ""
      element.style.paddingInline = ""
    })

    return () => controls.stop()
  }, [collapsed, fullSwipe, shouldReduceMotion])

  return useRender({
    defaultTagName: "button",
    render,
    props: mergeProps<"button">(
      {
        "data-slot": "swipe-action",
        "data-armed": isArmed && fullSwipe ? "" : undefined,
        ref,
        type: "button",
        style: fullSwipe ? { flexGrow: 1 } : undefined,
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
