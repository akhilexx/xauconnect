# Fiat Buy/Sell (On-ramp & Off-ramp) — Setup Guide

XAUConnect's **Buy/Sell crypto** feature lets users pay with card, Apple Pay,
Google Pay and bank transfer (and cash out the same way), with the crypto
delivered straight to their **own wallet** (non-custodial). Card data, KYC and
fiat settlement are handled by a regulated provider — XAUConnect never stores
card details.

The integration is **provider-agnostic**: the same `/onramp` API and UI work
with whichever provider you configure. Selection is controlled by
`ONRAMP_PROVIDER` (`auto` picks the first configured provider in priority order:
**Transak → Onramper**).

The feature is **gated behind env keys**. Until a provider is configured the
panel shows "coming soon" and `GET /api/health` reports `fiatOnramp: false`.

---

## Important: there is no legitimate "zero-KYB" card on-ramp

Every compliant card→crypto provider (Transak, MoonPay, Banxa, Onramper,
ChangeNOW/Guardarian, …) requires **KYB before production**, because the
provider is the **Merchant of Record** and Visa/Mastercard + regulators require
it. "No-KYB" card gateways are high-risk/anonymous processors that will get your
domain flagged — do not use them.

What you **can** do immediately is build and fully test the live flow today with
**Transak's instant staging key**, then flip to production after a one-time KYB.

---

## Recommended: Transak (instant staging, Merchant of Record)

### 1. Create the account & get keys (instant)

1. Go to **dashboard.transak.com** and sign up with a corporate email.
2. **Developers → API Keys** — your **Staging** API key + secret are available
   immediately (no KYB). Use the Environment dropdown to switch Staging/Production.
3. Submit KYB at **forms.transak.com/kyb** to unlock the **Production** key
   (Transak is the Merchant of Record, so this is lighter than becoming a PSP).

### 2. Configure env on the server

Edit `C:\xauconnect\.env` (never overwritten by deploys):

```dotenv
ONRAMP_PROVIDER="transak"
TRANSAK_API_KEY="your_staging_or_prod_api_key"
TRANSAK_API_SECRET="your_api_secret"
TRANSAK_ENVIRONMENT="staging"     # switch to "production" after KYB
```

Restart and verify:

```powershell
nssm restart xauconnect-backend
```
```bash
curl -s https://xauconnect.com/api/health | tr ',' '\n' | grep fiat   # "fiatOnramp":true
```

`/buy-crypto` and `/sell-crypto` switch from "coming soon" to the live panel.

### 3. Configure your fee (markup)

With Transak, your platform markup is set in the **Transak dashboard**
(Settings → Markup/Fees) and is already included in the quote the user sees.
(The admin **Buy/Sell fee** column in XAUConnect drives the Onramper path; for
Transak the markup lives in the Transak dashboard.)

### 4. Webhook (order status → admin records)

In the Transak dashboard add a webhook endpoint:

- **URL:** `https://xauconnect.com/api/onramp/webhook/transak`

The backend verifies the signed payload with `TRANSAK_API_SECRET` and updates
the matching transaction (correlated by `partnerOrderId`).

### 5. Test (staging)

Open `/buy-crypto`, start a purchase, and use a Transak **test card** (see
docs.transak.com) in the hosted widget. Confirm the order appears under
**Admin → Buy/Sell**, then switch `TRANSAK_ENVIRONMENT="production"` once KYB
is approved.

### Networks supported

Ethereum, BNB Chain, Polygon, Arbitrum, Base, Avalanche C-Chain, Solana
(Transak network ids are mapped automatically; Avalanche → `avaxcchain`).

---

## Optional fallback: Onramper (aggregator)

Onramper fans out across many PSPs (MoonPay, Transak, Banxa, Stripe,
Guardarian). It requires partner KYB to issue keys. To use it:

```dotenv
ONRAMP_PROVIDER="onramper"   # or "auto"
ONRAMPER_API_KEY="..."
ONRAMPER_PUBLISHABLE_KEY="..."
ONRAMPER_WEBHOOK_SECRET="..."
```

Webhook URL: `https://xauconnect.com/api/onramp/webhook`. Partner fee is set per
chain in **Admin → Buy/Sell fee** (defaults 3% EVM / 5% Solana).

---

## Why not NOWPayments for buy/sell?

NOWPayments' fiat on-ramp is a **merchant-payment** model: the customer pays
fiat and the resulting crypto is sent to **your payout wallet** (it routes via
Guardarian and still requires KYB). That's great for *accepting* fiat into your
treasury, but it does **not** deliver crypto to the buyer's own wallet — so it
is not suitable for a non-custodial consumer "buy crypto to my wallet" flow.
Use Transak (or Onramper) for consumer buy/sell.

---

## PSP application links (for Onramper bring-your-own or direct deals)

| Provider | Apply |
| --- | --- |
| Transak | <https://dashboard.transak.com/> · KYB: <https://forms.transak.com/kyb> |
| MoonPay | <https://www.moonpay.com/business> |
| Banxa | <https://banxa.com/partner/> |
| Stripe (crypto) | <https://stripe.com/crypto> |
| Guardarian | <https://guardarian.com/integrate-us> |
| Mercuryo | <https://mercuryo.io/business/> |
| Coinbase Onramp | <https://www.coinbase.com/developer-platform/products/onramp> |

---

## Reference

- Provider registry: `backend/src/services/onramp/index.ts`
- Transak adapter: `backend/src/services/onramp/transak.ts`
- Onramper adapter: `backend/src/services/onramp/onramper.ts`
- Routes: `backend/src/routes/onramp.ts` (mounted at `/api/onramp/*`)
- UI: `apps/web/src/components/onramp/buy-sell-panel.tsx`
- Pages: `/buy-crypto`, `/sell-crypto`
- Transak docs: <https://docs.transak.com/> · Onramper docs: <https://docs.onramper.com/>
