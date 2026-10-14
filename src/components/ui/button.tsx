import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold tracking-wide transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper focus-visible:ring-offset-2 focus-visible:ring-offset-pitch",
  {
    variants: {
      variant: {
        primary: "bg-gold text-ink hover:bg-gold-light",
        secondary: "border border-line bg-panel text-fog hover:border-paper hover:text-paper",
        ghost: "text-mist hover:text-paper hover:bg-white/5",
        danger: "bg-neutral-800 text-paper hover:bg-neutral-700",
      },
      size: {
        md: "h-11 px-4",
        sm: "h-9 px-3 text-xs uppercase",
        lg: "h-12 px-5 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
