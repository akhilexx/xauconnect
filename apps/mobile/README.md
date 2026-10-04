# XAUConnect Mobile (Expo)

React Native app sharing the XAUConnect backend API and Liquid Glass design
tokens with the web app.

## Why this folder is outside the pnpm workspace

Expo/Metro manages its own dependency tree (React 18 / RN-specific packages
that conflict with the React 19 web workspace). The app therefore installs
dependencies locally instead of via the monorepo root:

```bash
cd apps/mobile
npm install        # or: npx expo install
npx expo start     # press i (iOS), a (Android), or w (web)
```

## Configuration

- **Backend URL** — set `expo.extra.apiUrl` in `app.json`
  (default `http://localhost:4000`; use your machine's LAN IP for physical
  devices, e.g. `http://192.168.1.10:4000`).
- **Design tokens** — `src/theme.ts` mirrors `packages/ui/tailwind-preset.cjs`.
  Keep both in sync when changing brand colors.
- **API client** — `src/api.ts` mirrors `packages/sdk` (the endpoint shapes are
  identical; only the fetch wrapper differs).

## Screens

| Screen   | Features                                                              |
| -------- | --------------------------------------------------------------------- |
| Swap     | Chain pills, token pair, live aggregated quotes, per-DEX route list   |
| Discover | Trending / New / Gainers / Volume feeds, pull-to-refresh              |
| Token    | Price, 24h change, market cap / liquidity / volume / holders          |
| Wallet   | Watch-only multi-chain portfolio (live RPC balances via backend)      |
| Settings | WalletConnect pairing placeholder, backend endpoint, about            |

## Roadmap

- WalletConnect v2 mobile linking for transaction signing
- Native candlestick chart (`react-native-wagmi-charts`) on the Token screen
- Push notifications for price alerts and launch graduations
- Embedded wallet module (shared with web, security-audit gated)
