import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "destructive" | "outline" | "ghost";
  size?: "default" | "lg" | "sm";
};

const base =
  "inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

const variants: Record<NonNullable<Props["variant"]>, string> = {
  default: "bg-black text-white hover:bg-black/90 focus-visible:ring-black",
  destructive:
    "bg-red-600 text-white hover:bg-red-600/90 focus-visible:ring-red-600",
  outline:
    "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 focus-visible:ring-gray-400",
  ghost:
    "bg-transparent text-gray-700 hover:bg-gray-100 focus-visible:ring-gray-400",
};

const sizes: Record<NonNullable<Props["size"]>, string> = {
  default: "h-10 px-4 py-2 text-sm",
  lg: "h-12 px-6 py-3 text-base",
  sm: "h-8 px-3 py-1.5 text-xs",
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
