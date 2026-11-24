# Admin UI browser checks

The admin console is an internal Next.js destination in the shared SiteShell. Use the Admin header item on desktop or **More → Admin** on phones. The sidebar (Sections on narrower screens) changes the section hash so that history and deep links work.

The UI rules are in [.cursor/rules/app-ui.mdc](../../.cursor/rules/app-ui.mdc). Reuse the shared Liquid Glass primitives and theme variables for new admin surfaces.

## Remembered admin logins

A browser admin login lasts **365 days from sign-in** by default, even after inactivity, closing the browser or restarting the API. Set `ADMIN_BROWSER_SESSION_DAYS` (1–365) to change the lifetime of newly issued browser sessions. The browser holds a random credential in a Secure, HttpOnly, SameSite=Strict cookie. PostgreSQL keeps only its keyed digest, principal, credential tag and expiry. Browser UI storage contains no admin secret; the console can recover its identity from the cookie.

Signing out deletes that device's server record. Other devices keep their own sessions. Clearing the browser's cookies requires signing in again. Rotating the JWT secret invalidates these credentials; changing the console password/email or removing a wallet from the admin allowlist also invalidates the corresponding access. Operators can revoke all remembered logins for a principal by deleting its rows from `AdminBrowserSession`. Expired rows are pruned when a new browser session is issued. API bearer admin sessions retain their 30-minute limit.

## Repeat the browser checks

Use Node 22 and a Playwright installation with Chromium and WebKit browsers available. Set `PLAYWRIGHT_MODULE` to the installed module path if it is outside the workspace; set `CHROME_PATH` to use an installed Chrome binary. Supply the operator login via the environment or a restricted local env file.

```sh
XAU_ADMIN_DEVICES=desktop,tablet,android,iphone \
  node --env-file=.local/production.env scripts/verify-admin-ui.cjs
```

The runner signs in normally, navigates from Wallet to Admin, checks that both routes share the same document and header, and exercises each of the nine sections. It checks mobile record layout, field labels, overflow, filters, draft persistence, chart controls, the add-wallet dialog, browser history and logout. An optional `XAU_ADMIN_SHOTS` directory receives screenshots; keep these private.

For pre-release checks, serve the production build on the app host bound to loopback, forward its port over SSH and set `XAU_ADMIN_PREVIEW=http://127.0.0.1:PORT`. The browser uses that build for HTML, route payloads and chunks. Login credentials are sent only to the public HTTPS app origin. Fee saves, wallet registrations and listing decisions in preview are intercepted in the browser. The live run blocks all admin API writes and checks editing and cancellation without changing production data.

## Release integrity

Deploy compiled Next files into an empty staging directory. Overlaying an existing `.next/server` directory can leave obsolete routes active even when the source, build ID and new HTML files match. The deployment promotes the clean build, retains recent hashed browser assets, and verifies that the web origin actually references the staged admin login chunk. It restores the preceding build if the new one fails that check.
