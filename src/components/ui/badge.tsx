import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
<<<<<<< HEAD

=======
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
<<<<<<< HEAD
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
=======
        default: "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
<<<<<<< HEAD
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
=======
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
}

export { Badge, badgeVariants }
