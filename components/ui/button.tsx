import { cn } from "@/lib/utils";
import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--accent-primary)] text-black hover:bg-[var(--accent-hover)] font-semibold",
  secondary:
    "bg-[var(--surface-secondary)] text-white hover:bg-[var(--surface-elevated)] border border-[var(--border-subtle)]",
  ghost: "bg-transparent text-white hover:bg-[var(--surface-secondary)]",
  outline:
    "bg-transparent text-white border border-[var(--border-subtle)] hover:border-[var(--border-active)]",
  danger: "bg-[var(--danger)] text-white hover:opacity-90 font-semibold",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-xl",
  md: "h-11 px-4 text-sm rounded-2xl",
  lg: "h-14 px-6 text-base rounded-2xl",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none min-h-[44px]",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
