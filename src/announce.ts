/** Speaks a status message through the page's polite live region. */
export function announce(message: string): void {
  const status = document.getElementById("status");
  if (!status) return;
  status.textContent = message;
  setTimeout(() => (status.textContent = ""), 1000);
}
