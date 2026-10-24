/**
 * Phones, homepage: a tap on the name shows Contact and Links under it, and a second tap hides
 * them (`Name` and `Links` in `layout.tsx`). Closed, they leave the screen to the project table.
 * Desktop keeps them in the sidebar, where the button is not shown.
 *
 * Open, the Contact column starts where the table's Subject column starts: the Links column
 * takes the room up to the first descriptor, published as `--subject-start`.
 */
export function toggleLinks(): void {
  const button = document.querySelector<HTMLButtonElement>("[data-links-toggle]");
  const links = document.getElementById("profile-links");
  if (!button || !links) return;
  const align = () => {
    const subject = document.querySelector("[data-rows] [data-descriptor]");
    if (!subject) return;
    const start = subject.getBoundingClientRect().left - links.getBoundingClientRect().left;
    links.style.setProperty("--subject-start", `${start}px`);
  };
  button.addEventListener("click", () => {
    const open = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", String(open));
    document.documentElement.toggleAttribute("data-links-open", open);
    if (open) align();
  });
  addEventListener("resize", () => {
    if (button.getAttribute("aria-expanded") === "true") align();
  });
}
