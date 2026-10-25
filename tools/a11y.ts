import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright";
import { startSoliton } from "./soliton-process";

const app = await startSoliton();
try {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const unknown = new URL("/this-page-does-not-exist", app.url).href;
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      // Chromium reports the expected document 404 as a network console error.
      // Keep every other diagnostic, including missing assets and hydration errors.
      if (
        message.location().url === unknown &&
        message.text() === "Failed to load resource: the server responded with a status of 404 (Not Found)"
      )
        return;
      if (message.type() === "error" || message.type() === "warning") errors.push(message.text());
    });
    await page.goto(app.url);
    await page.evaluate(() => document.fonts.ready);
    for (const mode of ["void", "paper"]) {
      if (mode === "paper") {
        const control = page.getByRole("button", { name: "paper mode" });
        await control.click();
        // Audit the settled mode, after the control's token-driven colour transition.
        await control.evaluate((element) =>
          Promise.all(element.getAnimations().map((animation) => animation.finished)),
        );
      }
      const result = await new AxeBuilder({ page }).analyze();
      const findings = [
        ...result.violations,
        ...result.incomplete.filter((finding) => finding.id === "color-contrast"),
      ];
      if (findings.length) throw new Error(`${mode}: ${JSON.stringify(findings, null, 2)}`);
      console.log(`${mode}: axe found 0 violations`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto(unknown);
    if (response?.status() !== 404) throw new Error("unknown route must return HTTP 404");
    await page.getByRole("link", { name: "back to the start" }).click();
    await page.waitForURL(app.url);
    await page.getByRole("main").waitFor();
    if (errors.length) throw new Error(`browser diagnostics: ${errors.join("\n")}`);
    console.log("404 recovery works; 0 JavaScript errors, hydration warnings or unexpected console diagnostics");
  } finally {
    await browser.close();
  }
} finally {
  await app.stop();
}
