# Swap accounting and the November 24 reconciliation

The public record endpoint accepts only `{buildId, chainKey, txHash}`. A 202 is a queued verification, not a receipt. The build ticket contains the wallet, assets, original payload fingerprint, recipient and contemporaneous price snapshot. Quotes and tickets are never money. The worker checks finality, payload identity, successful execution and actual asset movement. It writes one settlement per chain and canonical hash. Daily charts use settlement time in UTC. Old ChainStat increments are not a source for swap accounting.

The USD figures are estimates for priced assets. A fee credited in a token is valued separately from volume. Unknown prices stay unpriced; no demo price, fixed dollar peg or configured fee rate is used. Treasury balances, gas, trading venue fees, fiat estimates, bridge origin transactions and pending attempts are excluded. Completed same-chain legs of composite routes can be recorded individually. A bridge status is not an end-to-end swap receipt.

## Production reconciliation, 24 November 2026

At 08:43 UTC, the original Swap table contained 14 reports. Five were labelled confirmed. Their unchecked totals were $987,654,331.344001 of volume and $2,962,963.241924 of fees. One Ethereum hash had no receipt; two other confirmed identifiers were invalid. The Solana signature labelled submitted resolved to a failed transaction. No hash was accepted solely because the report said confirmed.

Two historical receipts were independently checked against mainnet and the configured protocol collectors:

- [Polygon receipt](https://polygonscan.com/tx/0x4665f0e4423642b251d90cbe1310c5c445ff95ea82eccc9bca889be1a4bef202): successful smart wallet operation, 3.2 USDT debited; 40.283306013174665333 POL delivered; ERC-20 Transfer credited 0.096 USDT to the protocol's EVM collector. Gas reimbursement was excluded. Canonical block 88,514,372 (see hash in SQL).
- [Solana receipt](https://solscan.io/tx/4j2VyCdUQetzpDgAmJ8PBpbKuNFEhirj75nZF2d6Rd3LJ8wLZZtoNumGihNPCz3EM4v8aRtpvbuk2GGLZSCZ24BB): finalized slot 426307675, 0.05 wrapped SOL spent; the signer received 3.268563 USDT and the protocol wallet's token account gained 0.172029 USDT. Account rent was excluded.

The historical prices are [Solana and USDT at Solana settlement](https://coins.llama.fi/prices/historical/1781396902/coingecko:solana,coingecko:tether) and [USDT at Polygon settlement](https://coins.llama.fi/prices/historical/1781476543/coingecko:tether). Price samples were within 24 seconds of the respective block times. The resulting volume is $6.6339266361 and the fee estimate is $0.2678868446 (0.268029 USDT actually received).

## Operations

Apply the additive schema migration before starting the updated API. Keep original rows and counters for investigation. The separately reviewed SQL file in this directory inserts only the two above receipts, without reusing client financial fields. It is idempotent and requires a legacy report for each hash. Do not promote legacy status strings. Do not roll back to a public writer that accepts financial fields.

A 503 or unavailable chart is not a zero balance. The queue retries missing receipts, RPC outages and insufficient finality. After 48 hours unresolved work moves to review; inspect the recorded hash, ticket, RPC trace availability and block before requeuing. For native EVM swaps some providers must support call traces; smart wallets need a trace scoped to the signed call. Unsupported or ambiguous evidence can undercount. Builds expire for submission after 24 hours; stale builds cannot supply a historical price. Do not infer volume for unreported transactions. Fees paid in a separate asset or credited later require separate attribution before inclusion.

Browser admin access uses an HttpOnly, Secure, SameSite cookie with an explicit request header; existing admin sessions must sign in again. Deploy behind the configured trusted proxy, with shared Redis for multiple API replicas. Only the offline Solana provisioning script needs a fee-payer secret; provision fee accounts before enabling a new output mint. Raw API source labels are self-declared integration metadata.

## Security observations at release

The Windows host had ordinary authenticated local users on the access lists of the application directory, environment files and an older deployed copy of the treasury key file. The release archive now excludes private directories and environment files. The two PowerShell protection scripts restrict file and application writes to the deploy identity, administrators and SYSTEM. Backend and Next listen on loopback; Caddy handles public HTTP. Defender real-time protection and all Windows firewall profiles were enabled when checked. These checks do not establish whether anyone previously read a secret.

For incident response, treat the older credentials as exposed. Rotate privileged API/database credentials in coordination with their consumers. Move treasury authority to fresh keys created under the owner's control and review on-chain permissions before retiring old wallets. A file permission change does not revoke a copied private key. The three web-stack services still run as LocalSystem; migrate them to separate low-privilege identities with tested ACLs. One user deletion on November 24 at 08:06 UTC had no actor ID. Preserve audit and host logs; the row does not identify who performed it.

The production workspace dependency audit went from 6 critical / 65 high / 89 moderate / 4 low to 0 critical / 18 high / 35 moderate / 3 low. The remaining high findings involve bigint-buffer, decode-uri-component, deepmerge-ts, image-size, ip-address, sharp, toml and zod. Some are in tooling or transitive wallet libraries; an advisory count is not proof of reachability. bigint-buffer has no published fix in the advisory; replacing that path and upgrading across incompatible dependency majors need compatibility validation. The standalone Expo app has its own dependency tree.

The deployed package includes a separate script for the Caddy executable/configuration and the NSSM service wrapper. It preserves ordinary read/execute access and removes ordinary write access from those service paths. The host's documented Cloudflare-to-Caddy connection uses HTTP; coordinate an origin certificate and Cloudflare Full (strict) before requiring TLS on that hop. No credential rotation or treasury transfer was performed during this deployment.

Final production verification: the permission sweep inspected 284,351 real filesystem objects with zero errors or additional corrections on the final pass; 6,005 reparse points were skipped to avoid following package links. The source entrypoint, built UI, runtime dependency and secret-file permissions were sampled separately. Public HTTPS health and live feeds passed. An authenticated desktop/mobile check confirmed two ledger rows, matching USD totals, chart controls and logout. No new wallet transaction was broadcast during verification.
