"use client";

import { useEffect, useState } from "react";
import { THEME_STORAGE_KEY, type ThemePreference } from "@/lib/theme";

export function ThemeToggle() {
  const [preference, setPreference] = useState<ThemePreference>("system");

  useEffect(() => {
    const read = () => {
      let saved: string | null = null;
      try { saved = localStorage.getItem(THEME_STORAGE_KEY); } catch { /* Use the browser setting. */ }
      const next: ThemePreference = saved === "light" || saved === "dark" ? saved : "system";
      if (next === "system") delete document.documentElement.dataset.theme;
      else document.documentElement.dataset.theme = next;
      setPreference(next);
    };
    read();
    const sync = (event: StorageEvent) => { if (event.key === THEME_STORAGE_KEY || event.key === null) read(); };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  function change(next: ThemePreference) {
    if (next === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = next;
    setPreference(next);
    try {
      if (next === "system") localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch { /* The selection still works for this page. */ }
  }

  return <label className="relative shrink-0">
    <span className="sr-only">Color theme</span>
    <select aria-label="Color theme" value={preference} onChange={event => change(event.target.value as ThemePreference)} className="min-h-10 cursor-pointer rounded-lg border border-line bg-panel px-2 py-2 text-xs font-medium text-ink">
      <option value="system">System</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>;
}
