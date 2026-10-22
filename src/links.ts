/**
 * Phones, homepage: a tap on the name shows Contact and Links under it, and a second tap hides
 * them (`Name` and `Links` in `layout.tsx`). Closed, they leave the screen to the project table.
 * Desktop keeps them in the sidebar, where the button is not shown.
 */
export function toggleLinks(): void {
  const button = document.querySelector<HTMLButtonElement>("[data-links-toggle]");
  if (!button) return;
  button.addEventListener("click", () => {
    const open = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", String(open));
    document.documentElement.toggleAttribute("data-links-open", open);
  });
}
