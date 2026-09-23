import * as React from "react"
import { Slot } from '@radix-ui/react-slot'
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "secondary" | "ghost"
  size?: "default" | "sm" | "lg"
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    const buttonClasses = cn(
      "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50",
      {
        "bg-primary text-primary-foreground hover:bg-primary/90": variant === "default",
        "border border-border bg-background hover:bg-secondary hover:text-secondary-foreground": variant === "outline",
        "bg-secondary text-secondary-foreground hover:bg-secondary/80": variant === "secondary",
        "hover:bg-secondary hover:text-secondary-foreground": variant === "ghost",
      },
      {
        "h-10 px-4 py-2": size === "default",
        "h-9 rounded-md px-3": size === "sm",
        "h-11 rounded-md px-8": size === "lg",
      },
      className,
    )

    return <Comp className={buttonClasses} ref={ref} {...props} />
  },
)
Button.displayName = "Button"

export { Button }
