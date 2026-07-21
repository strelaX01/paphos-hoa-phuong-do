import * as React from "react"

import { cn } from "@/lib/utils"

function Progress({ className, value = 0, ...props }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0))

  return (
    <div
      data-slot="progress"
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className="h-full w-full flex-1 rounded-full bg-primary transition-all"
        style={{ transform: `translateX(-${100 - safeValue}%)` }}
      />
    </div>
  )
}

export { Progress }
