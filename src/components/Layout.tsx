import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { links, contactLinks } from "../content/links";
import { site } from "../content/site";
import { useTheme } from "../lib/theme";

export function ContactLinks() {
  const [status, setStatus] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  async function copy() {
    try {
      await navigator.clipboard.writeText(site.email);
      setStatus("Copied");
    } catch {
      setStatus("Copy failed");
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus(""), 1800);
  }
  return (
    <nav class="links" aria-label="Public profiles and contact">
      <p class="links-label">Links</p>
      {links.map((link) => (
        <a
          class="external-link"
          key={link.href}
          href={link.href}
          target="_blank"
          rel="me noopener noreferrer"
        >
          {link.label}
        </a>
      ))}
      <p class="links-label contact-label">Contact</p>
      <button class="email" type="button" onClick={copy} aria-label={`Copy ${site.email}`}>
        {status || site.email}
      </button>
      {contactLinks.map((link) => (
        <a
          class="external-link"
          key={link.href}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {link.label}
        </a>
      ))}
      <span class="sr-only" role="status">
        {status}
      </span>
    </nav>
  );
}
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const label = `Switch to ${theme === "dark" ? "light" : "dark"} mode`;
  return (
    <button class="theme-toggle" type="button" aria-label={label} title={label} onClick={toggle}>
      <svg class="sun-icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="3.5" />
        <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
      </svg>
      <svg class="moon-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20.7 13a8.5 8.5 0 0 1-9.7-9.7A9 9 0 1 0 20.7 13Z" />
      </svg>
    </button>
  );
}
export function Layout({
  children,
  home = false,
}: {
  children: ComponentChildren;
  home?: boolean;
}) {
  return (
    <div class={`wrapper ${home ? "home-page" : "case-page"}`}>
      <div class="layout">
        <aside class="sidebar" aria-labelledby="site-title">
          <h1 class="name" id="site-title">
            {home ? site.name : <a href="/">{site.name}</a>}
          </h1>
          <ContactLinks />
          <ThemeToggle />
        </aside>
        <main class="content" id="main-content">
          {children}
          <footer class="site-footer">
            <nav class="references-links" aria-label="Metadata">
              <a href="/humans.txt" rel="author">
                humans.txt
              </a>
              <a href="/llms.txt">llms.txt</a>
              <a href="https://github.com/gildrb/web" target="_blank" rel="noopener noreferrer">
                source
              </a>
            </nav>
          </footer>
        </main>
      </div>
    </div>
  );
}
