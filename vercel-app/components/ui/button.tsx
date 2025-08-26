"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
          variant === "primary"
            ? "bg-sky-500 text-white hover:bg-sky-600"
            : "border border-sky-500 text-sky-500 hover:bg-sky-50",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
