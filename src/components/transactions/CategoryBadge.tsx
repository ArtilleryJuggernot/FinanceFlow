"use client";

import { cn } from "@/lib/utils";

interface CategoryBadgeProps {
  name?: string | null;
  color?: string | null;
  icon?: string | null;
  className?: string;
}

export function CategoryBadge({ name, color, icon, className }: CategoryBadgeProps) {
  if (!name) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
          "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
          className
        )}
      >
        <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500" />
        Non catégorisé
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        className
      )}
      style={{
        backgroundColor: color ? `${color}18` : undefined,
        color: color || undefined,
      }}
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: color || undefined }}
      />
      {icon && <span className="text-xs">{icon}</span>}
      {name}
    </span>
  );
}
