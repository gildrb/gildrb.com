// Email copy functionality
document.querySelectorAll(".email").forEach((email) => {
  let feedbackTimer;

  email.addEventListener("click", async function () {
    this.blur();
    clearTimeout(feedbackTimer);

    try {
      await navigator.clipboard.writeText("mail@gildrb.com");
      this.classList.add("copied");
      trackEvent("Email Copy", { result: "success" });
      announce("Email copied to clipboard");
    } catch {
      this.classList.add("copy-failed");
      trackEvent("Email Copy", { result: "failed" });
      announce("Email could not be copied");
    }

    clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => {
      this.classList.remove("copied", "copy-failed");
    }, 1000);
  });
});
