import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm transition-shadow hover:shadow-md",
        className
      )}
      {...props}
    />
  );
}
