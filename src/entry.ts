// A critically damped spring (no overshoot), sampled for CSS `linear()`. `zoom.ts` moves images
// on it.
export const spring =
  "linear(0, 0.078, 0.235, 0.401, 0.549, 0.669, 0.762, 0.831, 0.882, 0.918, 0.944, 0.962, 0.974, 0.982, 0.988, 0.992, 0.995, 0.996, 0.998, 0.998, 1)";

// The length of an image's enlargement, which travels far and so must not linger.
export const fadeDuration = 330;

/**
 * Runs in every page's `<head>`, right after the stylesheet: until Inter has loaded, the page stays
 * hidden, so the first frame is always the intended one (browsers keep the previous page on screen
 * meanwhile). Capped at one second so a slow or blocked font never hangs the page; the
 * metric-matched fallback then shows and swaps to Inter once it arrives. Without JavaScript nothing
 * is held.
 */
export const fontGate = `const r=document.documentElement;const inter=[...document.fonts].find(f=>f.family.replace(/"/g,"")==="Inter");if(inter&&inter.status!=="loaded"){r.style.setProperty("--first-paint","hidden");const go=()=>{window.__align?.();r.style.removeProperty("--first-paint")};inter.load().then(go,go);setTimeout(go,1000)}`;
