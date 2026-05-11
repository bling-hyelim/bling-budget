"use client";

import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  variant?: "default" | "ghost";
  size?: "sm" | "md";
}

export function Chip({
  active = false,
  variant = "default",
  size = "sm",
  className,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      className={clsx(
        "rounded-full transition-all whitespace-nowrap",
        size === "sm" && "px-3 py-1.5 text-[13px]",
        size === "md" && "px-3.5 py-2 text-[14px]",
        active
          ? "bg-coral-50 text-coral-800 border border-coral-600 font-medium"
          : "border border-transparent",
        !active && variant === "default" && "bg-[var(--surface-soft)] text-ink-soft",
        !active && variant === "ghost" && "text-ink-soft",
        className
      )}
      {...rest}
    />
  );
}
