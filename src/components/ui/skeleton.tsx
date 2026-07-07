import { cn } from "@/lib/utils"

<<<<<<< HEAD
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-primary/10", className)}
      {...props}
    />
  )
=======
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-primary/10", className)} {...props} />
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
}

export { Skeleton }
