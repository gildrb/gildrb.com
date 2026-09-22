import { useEffect, useState } from "preact/hooks";
export type Theme = "light" | "dark";
export function readTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  const theme = document.documentElement.dataset.theme;
  return theme === "light" || theme === "dark"
    ? theme
    : matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
}
export function useTheme() {
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => {
    const sync = () => setTheme(readTheme());
    sync();
    const media = matchMedia("(prefers-color-scheme: light)");
    media.addEventListener("change", sync);
    const storage = (event: StorageEvent) => {
      if (event.key !== "theme") return;
      if (event.newValue === "dark" || event.newValue === "light")
        document.documentElement.dataset.theme = event.newValue;
      else delete document.documentElement.dataset.theme;
      sync();
    };
    window.addEventListener("storage", storage);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("storage", storage);
    };
  }, []);
  return {
    theme,
    toggle: () => {
      const next = readTheme() === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      setTheme(next);
      try {
        localStorage.setItem("theme", next);
      } catch {
        /* Private storage may be disabled. */
      }
    },
  };
}
