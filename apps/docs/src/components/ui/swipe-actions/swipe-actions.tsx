import type { ComponentProps } from "react"
import * as SwipeActionsPrimitive from "@ncdai/react-swipe-actions"

import { cn } from "@/lib/utils"

type SwipeSide = SwipeActionsPrimitive.SwipeSide
type SwipeState = SwipeActionsPrimitive.SwipeState

const SwipeRoot = SwipeActionsPrimitive.SwipeRoot

const SwipeItem = SwipeActionsPrimitive.SwipeItem

const SwipeActions = SwipeActionsPrimitive.SwipeActions

function SwipeAction({
  className,
  ...props
}: ComponentProps<typeof SwipeActionsPrimitive.SwipeAction>) {
  return (
    <SwipeActionsPrimitive.SwipeAction
      className={cn(
        "flex min-w-20 cursor-pointer flex-col items-center justify-center gap-1.5 px-4",
        "text-xs leading-tight whitespace-nowrap select-none",
        "bg-secondary text-secondary-foreground",
        "transition-[filter] hover:brightness-110 active:brightness-90",
        "focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-current",
        "[-webkit-tap-highlight-color:transparent] [&_svg]:size-5",
        className
      )}
      {...props}
    />
  )
}

function SwipeContent({
  className,
  ...props
}: ComponentProps<typeof SwipeActionsPrimitive.SwipeContent>) {
  return (
    <SwipeActionsPrimitive.SwipeContent
      className={cn("bg-background data-dragging:cursor-grabbing", className)}
      {...props}
    />
  )
}

export { SwipeAction, SwipeActions, SwipeContent, SwipeItem, SwipeRoot }
export type { SwipeSide, SwipeState }
