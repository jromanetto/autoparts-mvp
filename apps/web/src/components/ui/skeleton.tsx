import { cn } from "@/lib/utils";

function Skeleton({
  className,
  shimmer = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { shimmer?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted",
        shimmer
          ? "bg-gradient-to-r from-muted via-muted-foreground/5 to-muted bg-[length:200%_100%] animate-shimmer"
          : "animate-pulse",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
