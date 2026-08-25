"use client";

import { useEffect, useState } from "react";
import { MonitorIcon, MoonIcon, SunIcon } from "@/components/ui/icons";

type ThemeChoice = "light" | "dark" | "system";

const THEME_COOKIE = "sp-theme";

function applyTheme(choice: ThemeChoice) {
  if (choice === "system") {
    document.documentElement.removeAttribute("data-theme");
    document.cookie = `${THEME_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  } else {
    document.documentElement.setAttribute("data-theme", choice);
    document.cookie = `${THEME_COOKIE}=${choice}; path=/; max-age=31536000; SameSite=Lax`;
  }
}

const OPTIONS: { value: ThemeChoice; label: string; Icon: typeof SunIcon }[] = [
  { value: "light", label: "Light mode", Icon: SunIcon },
  { value: "dark", label: "Dark mode", Icon: MoonIcon },
  { value: "system", label: "Match system", Icon: MonitorIcon },
];

export function ThemeToggle({ className = "" }: { className?: string }) {
  // Server already sets the correct data-theme attribute (or leaves it
  // absent for "system"), so the PAGE itself never flashes. This component's
  // own highlighted-icon state must still start at "system" on both server
  // and first client render (a lazy initializer reading document here would
  // read a value the server couldn't have rendered, causing a real hydration
  // mismatch) and only correct itself after mount, once hydration is done.
  const [active, setActive] = useState<ThemeChoice>("system");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from an external system (the DOM attribute the server rendered) on mount, not deriving from props/state
    setActive(current === "light" || current === "dark" ? current : "system");
  }, []);

  function select(choice: ThemeChoice) {
    applyTheme(choice);
    setActive(choice);
  }

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className={`inline-flex items-center gap-0.5 rounded-full border border-border bg-surface-raised p-1 ${className}`}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const isActive = active === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={label}
            title={label}
            onClick={() => select(value)}
            className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
              isActive
                ? "bg-brand text-brand-foreground"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
