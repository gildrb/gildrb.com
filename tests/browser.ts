import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { informationPaths } from "../src/content/pages";
const url = process.env.TEST_URL ?? "http://127.0.0.1:5175";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE,
  headless: true,
});
await fs.mkdir("validation", { recursive: true });
const results: Record<string, unknown>[] = [];
try {
  for (const [width, height] of [
    [390, 844],
    [390, 650],
    [320, 568],
    [1280, 900],
  ] as const) {
    const context = await browser.newContext({ viewport: { width, height }, colorScheme: "dark" });
    await context.addInitScript(
      "Object.defineProperty(navigator, 'gpu', { value: undefined }); localStorage.setItem('theme', 'dark');",
    );
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const requests: string[] = [];
    page.on("request", (req) => requests.push(req.url()));
    await page.goto(url);
    await page.locator(".portfolio-card-link").first().waitFor();
    await page.waitForFunction(() =>
      performance.getEntriesByType("resource").some((item) => item.name.endsWith(".webp")),
    );
    const metrics = await page.evaluate(() => {
      const header = document.querySelector(".portfolio-table-header")!;
      const contact = document.querySelector(".contact-label")!;
      const scope = document.querySelector(".portfolio-sort-scope")!;
      const poster = performance
        .getEntriesByType("resource")
        .find((item) => item.name.endsWith(".webp"))!;
      return {
        width: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        headerBackground: getComputedStyle(header).backgroundColor,
        nameBackground: getComputedStyle(document.querySelector(".name")!).backgroundColor,
        contactX: contact.getBoundingClientRect().x,
        scopeX: scope.getBoundingClientRect().x,
        posterReadyMs: poster.startTime + poster.duration,
        poster: getComputedStyle(document.querySelector(".environment-poster")!).backgroundImage,
      };
    });
    assert.ok(metrics.documentWidth <= width, "No horizontal overflow");
    assert.equal(metrics.headerBackground, "rgba(0, 0, 0, 0)");
    assert.equal(metrics.nameBackground, "rgba(0, 0, 0, 0)");
    assert.match(metrics.poster, /environment\/(day|dusk|night)(?:-wide)?\.webp/);
    await page.screenshot({ path: `validation/start-${width}-${height}.png` });
    if (width < 768 && width >= 360)
      assert.ok(Math.abs(metrics.contactX - metrics.scopeX) < 1, "Contact aligns with Scope");
    assert.equal(await page.locator(".portfolio-card-link").count(), 9);
    assert.equal(await page.locator(".portfolio-card-title").first().innerText(), "davis7.sh");
    await page.getByRole("button", { name: "Sort projects by date, descending" }).click();
    assert.equal(await page.locator(".portfolio-card-title").first().innerText(), "mL7");
    await page.getByRole("button", { name: "Switch to light mode" }).click();
    assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
    await page.getByRole("button", { name: "Switch to dark mode" }).click();
    assert.ok(
      !requests.some((request) => /assets\/(runtime|CaseStudy|prerender)/.test(request)),
      "Homepage without GPU loads no graphics, case or server-rendering code",
    );
    await page.screenshot({ path: `validation/browser-${width}-${height}.png`, fullPage: true });
    assert.deepEqual(errors, []);
    results.push({ viewport: [width, height], ...metrics, pageErrors: errors });
    await context.close();
  }
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: "dark",
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url + "/heph");
  await page.getByRole("textbox", { name: "Heph question" }).fill("What is Frankenstein about?");
  await page.getByRole("button", { name: "Submit Heph prompt" }).click();
  await page.waitForFunction(
    () => !document.querySelector<HTMLButtonElement>(".heph-demo-submit")!.disabled,
  );
  assert.match(await page.locator(".heph-demo-output").innerText(), /Frankenstein/);
  await page.getByRole("textbox", { name: "Heph question" }).fill("/evidence E2");
  await page.getByRole("button", { name: "Submit Heph prompt" }).click();
  assert.match(await page.locator(".heph-demo-output").innerText(), /PAGE 43/);
  await page.goto(url + "/t3");
  assert.equal(await page.locator(".case-title").count(), 1);
  assert.ok((await page.locator(".case-media img").count()) > 0);
  await page.goto(url + "/all");
  assert.equal(await page.locator(".case-article").count(), 7);
  assert.equal(await page.locator('img[src^="media:"]').count(), 0);
  for (const route of informationPaths) {
    await page.goto(url + route);
    assert.equal(await page.locator(".case-title").count(), 1, route);
    assert.ok((await page.locator(".case-copy").innerText()).length > 30, route);
  }
  assert.deepEqual(errors, []);
  results.push({ casePages: "passed", informationPages: informationPaths, hephEvidence: "passed" });
  await context.close();
  const delayed = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: "dark",
  });
  await delayed.addInitScript(
    "Object.defineProperty(navigator, 'gpu', { value: {} }); localStorage.setItem('theme', 'dark');",
  );
  const delayedPage = await delayed.newPage();
  let requested = false;
  await delayedPage.route("**/assets/runtime-*.js", async (route) => {
    requested = true;
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.abort("failed");
  });
  await delayedPage.goto(url, { waitUntil: "domcontentloaded" });
  await delayedPage.waitForFunction(() =>
    performance.getEntriesByType("resource").some((item) => item.name.endsWith(".webp")),
  );
  assert.equal(
    await delayedPage.locator("#gildrb-atmosphere-background").getAttribute("data-status"),
    "loading",
  );
  assert.ok(await delayedPage.locator(".environment-poster").isVisible());
  await delayedPage
    .locator(".environment-poster")
    .screenshot({ path: "validation/slow-gpu-module.png" });
  await delayedPage.waitForFunction(
    () => document.querySelector("canvas")?.getAttribute("data-status") === "fallback",
  );
  assert.ok(requested, "The test delayed the actual GPU module request");
  assert.ok(await delayedPage.locator(".environment-poster").isVisible());
  results.push({
    delayedShaderDownload: "poster visible during loading and after module failure",
    delayMs: 1500,
  });
  await delayed.close();
  const noJS = await browser.newContext({
    javaScriptEnabled: false,
    colorScheme: "dark",
    viewport: { width: 390, height: 844 },
  });
  const staticPage = await noJS.newPage();
  await staticPage.goto(url);
  assert.equal(await staticPage.locator(".portfolio-card-link").count(), 9);
  await staticPage.locator(".environment-poster").screenshot({ path: "validation/no-js-sky.png" });
  await staticPage.goto(url + "/filen");
  assert.ok((await staticPage.locator(".case-media img").count()) > 0);
  results.push({ prerenderWithoutJavaScript: "passed" });
  await noJS.close();
} finally {
  await browser.close();
  await fs.writeFile("validation/browser.json", JSON.stringify(results, null, 2));
}
console.log(JSON.stringify(results, null, 2));
