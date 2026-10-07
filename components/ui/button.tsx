import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        default:
          "rounded-full bg-[image:var(--gradient-sunset)] text-accent-foreground shadow-[0_6px_20px_-6px_rgba(242,84,45,0.55)] hover:shadow-[0_8px_24px_-6px_rgba(242,84,45,0.7)] hover:brightness-105 focus-visible:ring-accent",
        secondary:
          "rounded-xl bg-secondary text-secondary-foreground hover:opacity-90 focus-visible:ring-secondary",
        ghost: "rounded-lg hover:bg-muted focus-visible:ring-muted-foreground",
        outline:
          "rounded-lg border border-border bg-transparent hover:bg-muted focus-visible:ring-muted-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-12 px-7 text-base",
        icon: "size-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
