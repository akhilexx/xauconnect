/**
 * Jupiter Swap API v2 — /build instruction assembly for wallet signing.
 * @see https://dev.jup.ag/docs/swap/v2/build
 */
import {
  AddressLookupTableAccount,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import { env } from "../../config.js";

const JUPITER_V2_BASE = "https://api.jup.ag/swap/v2";

type ApiAccount = {
  pubkey: string;
  isSigner: boolean;
  isWritable: boolean;
};

type ApiInstruction = {
  programId: string;
  accounts: ApiAccount[];
  data: string;
};

export type JupiterBuildResponse = {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct?: string;
  routePlan: unknown[];
  computeBudgetInstructions: ApiInstruction[];
  setupInstructions: ApiInstruction[];
  swapInstruction: ApiInstruction;
  cleanupInstruction: ApiInstruction | null;
  otherInstructions: ApiInstruction[];
  tipInstruction: ApiInstruction | null;
  addressesByLookupTableAddress: Record<string, string[]> | null;
  blockhashWithMetadata: {
    blockhash: number[];
    lastValidBlockHeight: number;
  };
};

export function jupiterApiHeaders(): Record<string, string> {
  return env.JUPITER_API_KEY ? { "x-api-key": env.JUPITER_API_KEY } : {};
}

function toInstruction(ix: ApiInstruction): TransactionInstruction {
  return new TransactionInstruction({
    programId: new PublicKey(ix.programId),
    keys: ix.accounts.map((acc) => ({
      pubkey: new PublicKey(acc.pubkey),
      isSigner: acc.isSigner,
      isWritable: acc.isWritable,
    })),
    data: Buffer.from(ix.data, "base64"),
  });
}

function transformALTs(raw: Record<string, string[]> | null): AddressLookupTableAccount[] {
  if (!raw) return [];
  return Object.entries(raw).map(
    ([key, addresses]) =>
      new AddressLookupTableAccount({
        key: new PublicKey(key),
        state: {
          deactivationSlot: BigInt("18446744073709551615"),
          lastExtendedSlot: 0,
          lastExtendedSlotStartIndex: 0,
          addresses: addresses.map((a) => new PublicKey(a)),
        },
      }),
  );
}

/** Assemble an unsigned v0 transaction from a `/build` response. */
export function assembleJupiterSwapTx(
  build: JupiterBuildResponse,
  feePayer: string,
): string {
  const instructions = [
    ...build.computeBudgetInstructions.map(toInstruction),
    ...build.setupInstructions.map(toInstruction),
    toInstruction(build.swapInstruction),
    ...(build.cleanupInstruction ? [toInstruction(build.cleanupInstruction)] : []),
    ...build.otherInstructions.map(toInstruction),
    ...(build.tipInstruction ? [toInstruction(build.tipInstruction)] : []),
  ];

  const recentBlockhash = bs58.encode(Buffer.from(build.blockhashWithMetadata.blockhash));
  const lookupTables = transformALTs(build.addressesByLookupTableAddress);
  const payer = new PublicKey(feePayer);

  const message = new TransactionMessage({
    payerKey: payer,
    recentBlockhash,
    instructions,
  }).compileToV0Message(lookupTables);

  const tx = new VersionedTransaction(message);
  return Buffer.from(tx.serialize()).toString("base64");
}

export async function fetchJupiterBuild(params: URLSearchParams): Promise<JupiterBuildResponse> {
  if (!env.JUPITER_API_KEY) {
    throw new Error("JUPITER_API_KEY required for Jupiter v2");
  }
  const url = `${JUPITER_V2_BASE}/build?${params.toString()}`;
  const res = await fetch(url, { headers: { accept: "application/json", ...jupiterApiHeaders() } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`jupiter v2 build ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`);
  }
  return res.json() as Promise<JupiterBuildResponse>;
}

export async function fetchJupiterOrder(params: URLSearchParams): Promise<Record<string, unknown>> {
  if (!env.JUPITER_API_KEY) {
    throw new Error("JUPITER_API_KEY required for Jupiter v2");
  }
  const url = `${JUPITER_V2_BASE}/order?${params.toString()}`;
  const res = await fetch(url, { headers: { accept: "application/json", ...jupiterApiHeaders() } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`jupiter v2 order ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}
