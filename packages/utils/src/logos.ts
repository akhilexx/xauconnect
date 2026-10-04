/**
 * Token logo resolution — real icons from the public Trust Wallet assets CDN,
 * with the explicit `logoURI` (API-provided) taking precedence. TokenIcon
 * falls back to a gold monogram if the CDN 404s.
 */
import { NATIVE_TOKEN_ADDRESS, SOLANA_NATIVE_MINT } from "./chains.js";
import type { TokenInfo } from "./tokens.js";

const TW_CDN = "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains";

/** XAUConnect chainKey -> Trust Wallet assets folder name. */
const TW_CHAIN: Record<string, string> = {
  ethereum: "ethereum",
  bsc: "smartchain",
  polygon: "polygon",
  arbitrum: "arbitrum",
  base: "base",
  avalanche: "avalanchec",
  solana: "solana",
};

/** Resolve the best-known logo URL for a token (undefined -> monogram fallback). */
export function getTokenLogoUrl(
  token: Pick<TokenInfo, "chainKey" | "address" | "logoURI">,
): string | undefined {
  if (token.logoURI) return token.logoURI;
  const folder = TW_CHAIN[token.chainKey];
  if (!folder) return undefined;
  if (token.address === NATIVE_TOKEN_ADDRESS || token.address === SOLANA_NATIVE_MINT) {
    return `${TW_CDN}/${folder}/info/logo.png`;
  }
  return `${TW_CDN}/${folder}/assets/${token.address}/logo.png`;
}

/** Real network logo for a chain key (undefined for unknown chains). */
export function getChainLogoUrl(chainKey: string): string | undefined {
  const folder = TW_CHAIN[chainKey];
  return folder ? `${TW_CDN}/${folder}/info/logo.png` : undefined;
}
