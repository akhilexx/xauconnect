// Read-only browser QA for the built or deployed XAUConnect UI.
// ADMIN_EMAIL / ADMIN_PASSWORD are supplied by the operator. No live admin mutation is forwarded.
// XAU_ADMIN_PREVIEW can point at the SSH-forwarded loopback Next production build.
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path");
const { chromium, webkit, devices } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const site = "https://xauconnect.com",
  preview = process.env.XAU_ADMIN_PREVIEW;
if (preview && !/^http:\/\/127\.0\.0\.1:\d+$/.test(preview))
  throw new Error("Preview requires an SSH loopback URL");
if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) throw new Error("Missing admin login");
const out = process.env.XAU_ADMIN_SHOTS;
if (out) fs.mkdirSync(out, { recursive: true, mode: 0o700 });
const variants = {
  desktop: { engine: chromium, options: { viewport: { width: 1440, height: 960 } } },
  tablet: { engine: chromium, options: { viewport: { width: 820, height: 1180 }, hasTouch: true } },
  android: {
    engine: chromium,
    options: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } },
  },
  iphone: {
    engine: webkit,
    options: { ...devices["iPhone 13 Mini"], viewport: { width: 375, height: 812 } },
  },
};
const wait = async (locator) => locator.first().waitFor({ state: "visible", timeout: 45000 });
async function check(name) {
  const { engine, options } = variants[name];
  if (name === "android" || name === "iphone")
    assert(options.hasTouch && options.isMobile, "Mobile device profile unavailable");
  const browser = await engine.launch({
    headless: true,
    ...(engine === chromium && process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : {}),
  });
  const context = await browser.newContext({
    ...options,
    reducedMotion: "reduce",
    serviceWorkers: "block",
  });
  const failures = [],
    blocked = [],
    observed = [],
    sections = [];
  let fixtureListing = Boolean(preview);
  let current = "sign in";
  const page = await context.newPage();
  page.on("pageerror", (e) => failures.push(e.name + ": " + e.message.slice(0, 120)));
  page.setDefaultTimeout(18000);
  await context.route(site + "/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      p = url.pathname,
      method = req.method();
    if (p.startsWith("/api/admin/") && !["GET", "HEAD"].includes(method)) {
      if (
        preview &&
        ((method === "PUT" && p.startsWith("/api/admin/fees/")) ||
          (method === "POST" && p === "/api/admin/wallets") ||
          (method === "POST" && p === "/api/admin/listings/ui-preview-listing"))
      ) {
        observed.push({ path: p, body: req.postDataJSON() });
        if (p.endsWith("ui-preview-listing")) fixtureListing = false;
        return route.fulfill({ json: { ok: true } });
      }
      blocked.push(method + " " + p);
      return route.abort();
    }
    if (preview && p === "/api/admin/listings" && method === "GET")
      return route.fulfill({
        json: {
          queue: fixtureListing
            ? [
                {
                  id: "ui-preview-listing",
                  name: "Preview listing",
                  symbol: "QA",
                  chainKey: "ethereum",
                  address: "0x0000000000000000000000000000000000000001",
                  createdAt: new Date().toISOString(),
                },
              ]
            : [],
        },
      });
    if (
      preview &&
      !p.startsWith("/api/") &&
      (p.startsWith("/_next/") || p.startsWith("/xaxmd5") || p === "/wallet")
    ) {
      // Serve the preview HTML, route payloads and chunks. Keep credentials on their real HTTPS origin.
      if (p === "/_next/image") return route.continue();
      const headers = { ...req.headers() };
      delete headers.cookie;
      delete headers.authorization;
      delete headers.host;
      try {
        const result = await route.fetch({
          url: preview + p + url.search,
          headers,
          timeout: 35000,
        });
        return await route.fulfill({ response: result });
      } catch {
        return route.abort();
      }
    }
    return route.continue();
  });
  const button = (label) => page.getByRole("button", { name: label, exact: true });
  const nav = page.getByRole("navigation", { name: "Admin sections" });
  async function section(label) {
    current = label;
    if (!(await nav.isVisible())) await button("Open admin sections").click();
    await nav.getByRole("link", { name: label, exact: true }).click();
    await wait(page.getByRole("heading", { level: 1, name: label, exact: true }));
    assert(
      await page.getByRole("navigation", { name: "Site navigation" }).isVisible(),
      "Site header missing",
    );
    sections.push(label);
  }
  async function fit() {
    await page.evaluate(() => document.fonts.ready);
    const errors = await page.evaluate(() => {
      const vw = window.innerWidth,
        issues = [];
      if (document.documentElement.scrollWidth > vw + 1) issues.push("document overflow");
      if (!document.querySelector("main ~ footer")) issues.push("shared footer missing");
      const area = document.querySelector(".admin-section");
      for (const table of document.querySelectorAll("table.admin-records")) {
        const row = table.querySelector("tbody tr");
        if (row && area) {
          const expected = area.clientWidth <= 799 ? "grid" : "table-row";
          if (getComputedStyle(row).display !== expected)
            issues.push(
              "record layout " + getComputedStyle(row).display + " (expected " + expected + ")",
            );
        }
      }
      for (const el of document.querySelectorAll(
        ".admin-section :is(select,input:not([type=checkbox]),table,form),[role=dialog] :is(select,input,form)",
      )) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && (rect.right > vw + 2 || rect.left < -2))
          issues.push(el.tagName + " outside screen");
      }
      return [...new Set(issues)];
    });
    assert.deepEqual(errors, [], name + " " + current + " layout");
  }
  async function shot(id) {
    if (!out) return;
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({
      path: path.join(out, name + "-" + id + ".png"),
      fullPage: false,
      animations: "disabled",
      style: "[data-sonner-toaster]{visibility:hidden!important}",
    });
  }
  try {
    await page.goto(site + "/xaxmd5/login", { waitUntil: "domcontentloaded" });
    await wait(page.getByRole("heading", { name: "Admin sign in" }));
    await fit();
    await page.getByLabel("Admin email", { exact: true }).fill(process.env.ADMIN_EMAIL);
    await page.locator("#admin-password").fill(process.env.ADMIN_PASSWORD);
    const login = page.waitForResponse((r) => r.url().endsWith("/api/auth/admin-login"));
    await button("Sign in to console").click();
    assert.equal((await login).status(), 200);
    await wait(page.getByText("Settled volume", { exact: true }));
    const siteNav = page.getByRole("navigation", { name: "Site navigation" });
    const dock = page.getByRole("navigation", { name: "Primary", exact: true });
    const mobile = options.viewport.width < 768;
    const goToAdmin = async () => {
      if (mobile) {
        await dock.getByRole("button", { name: "More" }).click();
        await page
          .getByRole("dialog", { name: "More destinations" })
          .getByRole("link", { name: "Admin", exact: true })
          .click();
      } else await siteNav.getByRole("link", { name: "Admin", exact: true }).click();
    };
    current = "app navigation";
    await (mobile ? dock : siteNav).getByRole("link", { name: "Wallet", exact: true }).click();
    await page.waitForURL("**/wallet");
    await page.evaluate(() => {
      window.__xauHeader = document.querySelector('nav[aria-label="Site navigation"]');
    });
    await goToAdmin();
    await wait(page.getByText("Settled volume", { exact: true }));
    assert.equal(context.pages().length, 1);
    assert(
      await page.evaluate(
        () => window.__xauHeader === document.querySelector('nav[aria-label="Site navigation"]'),
      ),
    );
    await page.goBack();
    await page.waitForURL("**/wallet");
    await page.goForward();
    await page.waitForURL("**/xaxmd5");
    await wait(page.getByText("Settled volume", { exact: true }));
    assert.equal(await dock.isVisible(), mobile);
    if (mobile)
      assert.equal(
        await dock.getByRole("button", { name: "More" }).getAttribute("aria-current"),
        "location",
      );
    if (await button("Open admin sections").isVisible()) {
      await button("Open admin sections").click();
      await page.keyboard.press("Escape");
      assert(
        await button("Open admin sections").evaluate((el) => el === document.activeElement),
        "Section navigation focus",
      );
    }
    current = "Overview";
    sections.push(current);
    await fit();
    const firstTile = page.locator(".ops-kpis > div").first();
    assert(
      await firstTile.evaluate(
        (el) =>
          el.classList.contains("glass") && !getComputedStyle(el).fontFamily.includes("Georgia"),
      ),
    );
    await page.getByLabel("Chart metric").selectOption("feesUsd");
    await button("7D").click();
    assert.equal(await button("7D").getAttribute("aria-pressed"), "true");
    await button("1Y").click();
    await page.getByLabel("Chart metric").selectOption("volumeUsd");
    await shot("overview");

    await section("Swap ledger");
    await wait(page.getByText("Volume (confirmed)", { exact: true }));
    const expand = page.locator(".admin-records button[aria-expanded]").first();
    if (await expand.count()) {
      await expand.click();
      await wait(
        page
          .getByText("Transaction hash", { exact: true })
          .or(page.getByText("Swap id", { exact: true })),
      );
      await expand.click();
    }
    await fit();
    await section("Fiat activity");
    await page.getByLabel("Order type").selectOption("sell");
    await page.getByLabel("Order status").selectOption("completed");
    await fit();
    await section("API activity");
    await wait(page.getByText("API requests (24h)", { exact: true }));
    await button("requests").click();
    await page.getByLabel("Filter by endpoint").selectOption("/quote");
    await button("Clear filters").click();
    await wait(page.getByRole("table", { name: "API requests" }));
    await fit();
    const firstRequest = page.locator(".admin-records tbody input[type=checkbox]").first();
    if (await firstRequest.count()) {
      await firstRequest.check();
      await page.getByLabel("Bulk edit client name").fill("Preview only");
      await button("Clear selection").click();
    }
    await section("Wallets");
    await wait(page.getByRole("table", { name: "Wallet directory" }));
    await fit();
    await button("Show wallet details").first().click();
    await wait(page.getByText("Full address", { exact: true }));
    await button("Hide wallet details").click();
    await page.getByLabel("Filter by type").selectOption("solana");
    await button("Clear filters").click();
    await button("Protocol treasury").click();
    await wait(button("Add wallet"));
    const group = page.locator(".admin-section button[aria-expanded]").first();
    if (await group.count()) {
      await group.click();
      await fit();
      await group.click();
    }
    await button("Add wallet").click();
    const dialog = page.getByRole("dialog", { name: "Add protocol wallet" });
    await wait(dialog);
    await dialog.getByLabel("Network").selectOption("solana");
    await dialog.getByLabel("Purpose").selectOption("operations");
    await dialog.getByLabel("Wallet address").fill("11111111111111111111111111111111");
    await dialog.getByLabel("Label (optional)").fill("Preview only");
    await fit();
    if (out)
      await dialog
        .locator("form")
        .screenshot({ path: path.join(out, name + "-wallet-form.png"), animations: "disabled" });
    if (preview) {
      await dialog.getByRole("button", { name: "Register wallet" }).click();
      await dialog.waitFor({ state: "hidden" });
      assert(
        observed.some((x) => x.path === "/api/admin/wallets" && x.body.purpose === "operations"),
      );
    } else await dialog.getByRole("button", { name: "Cancel" }).click();

    await section("Fee settings");
    const form = page.getByRole("form", { name: "Network fee settings" });
    await wait(form);
    const network = page.getByLabel("Network to configure");
    await network.selectOption("ethereum");
    const swap = form.getByRole("spinbutton", { name: /^Swap fee/ });
    const original = await swap.inputValue();
    const edited = original === "317" ? "318" : "317";
    await swap.fill("");
    assert(await button("Save fees").isDisabled());
    await swap.fill(edited);
    assert(await button("Save fees").isEnabled());
    await network.selectOption("solana");
    await wait(form.getByRole("heading", { name: "Solana fees" }));
    await network.selectOption("ethereum");
    assert.equal(await swap.inputValue(), edited);
    await button("Discard edits").click();
    assert.equal(await swap.inputValue(), original);
    assert(await button("Save fees").isDisabled());
    await fit();
    await shot("fees");
    if (preview) {
      await swap.fill(edited);
      await button("Save fees").click();
      await wait(page.getByText("Saved settings", { exact: true }));
      assert(
        observed.some(
          (x) => x.path === "/api/admin/fees/ethereum" && x.body.swapFeeBps === Number(edited),
        ),
      );
    }
    await page.reload({ waitUntil: "domcontentloaded" });
    await wait(page.getByRole("heading", { level: 1, name: "Fee settings" }));

    await section("Users");
    await wait(page.getByRole("table", { name: "User directory" }));
    await fit();
    await page.getByLabel("Filter by role").selectOption("ADMIN");
    await page.getByRole("searchbox", { name: "Search records" }).fill("ui-qa-absent-user");
    await wait(page.getByText("No users match your filters."));
    await button("Clear filters").click();
    await wait(page.getByRole("table", { name: "User directory" }));
    await section("Listing queue");
    if (preview) {
      await wait(button("Approve"));
      await fit();
      await button("Reject").click();
    }
    await wait(
      page
        .getByText(/The listing queue is empty/)
        .or(page.getByRole("button", { name: "Approve", exact: true })),
    );
    await fit();
    await section("Audit trail");
    await wait(
      page.getByText("Recent changes", { exact: true }).or(page.getByText(/No audit entries yet/)),
    );
    await fit();
    if (!(await nav.isVisible())) await button("Open admin sections").click();
    current = "logout";
    const loggedOut = page.waitForResponse((r) => r.url().endsWith("/api/auth/logout"), {
      timeout: 35000,
    });
    await Promise.all([loggedOut, button("Sign out").click()]);
    await page.waitForURL(/xaxmd5\/login/, { waitUntil: "commit", timeout: 45000 });
    await wait(button("Sign in to console"));
    assert.deepEqual(blocked, []);
    assert.deepEqual(failures, []);
    assert.equal(new Set(sections).size, 9);
    console.log(
      name +
        ": all 9 sections, same-document Admin entry, history, labelled forms, responsive records, chart controls and logout passed; live admin writes: 0.",
    );
  } catch (e) {
    throw new Error(
      name +
        " / " +
        current +
        ": " +
        String(e.message).split("\n").slice(0, 3).join(" ").slice(0, 350) +
        " at " +
        new URL(page.url()).pathname +
        new URL(page.url()).hash +
        "; page errors: " +
        failures.join("; "),
    );
  } finally {
    await context.close();
    await browser.close();
  }
}
(async () => {
  for (const name of (process.env.XAU_ADMIN_DEVICES || "desktop,android,iphone").split(","))
    await check(name);
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
