import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-2xs hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-rose-200/80 bg-rose-50 text-rose-700 shadow-2xs hover:bg-rose-100/80 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300",
        outline:
          "border-border/60 text-foreground bg-muted/20 hover:bg-muted/40",
        success:
          "border-emerald-200/80 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300",
        warning:
          "border-amber-200/80 bg-amber-50 text-amber-700 hover:bg-amber-100/80 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300",
        info:
          "border-sky-200/80 bg-sky-50 text-sky-700 hover:bg-sky-100/80 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-300",
        purple:
          "border-purple-200/80 bg-purple-50 text-purple-700 hover:bg-purple-100/80 dark:border-purple-800/60 dark:bg-purple-950/40 dark:text-purple-300",
        indigo:
          "border-indigo-200/80 bg-indigo-50 text-indigo-700 hover:bg-indigo-100/80 dark:border-indigo-800/60 dark:bg-indigo-950/40 dark:text-indigo-300",
        rose:
          "border-rose-200/80 bg-rose-50 text-rose-700 hover:bg-rose-100/80 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
