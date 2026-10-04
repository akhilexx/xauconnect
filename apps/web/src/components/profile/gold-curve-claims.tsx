"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import { VersionedTransaction } from "@solana/web3.js";
import type { GoldCurveFeePool } from "@xauconnect/sdk";
import { GlassButton, GlassCard, toast } from "@xauconnect/ui";
import { api } from "@/lib/api";

function formatRaw(raw: string, decimals: number): string {
  const padded = raw.padStart(decimals + 1, "0");
  const whole = padded.slice(0, -decimals);
  const frac = padded.slice(-decimals).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}

async function signAndSend(sign: (tx: VersionedTransaction) => Promise<VersionedTransaction>, base64: string) {
  const raw = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const signed = await sign(VersionedTransaction.deserialize(raw));
  const bytes = signed.serialize();
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return api.submitSolanaSwap(btoa(binary));
}

export function GoldCurveClaims() {
  const wallet = useWallet();
  const creator = wallet.publicKey?.toBase58() ?? "";
  const queryClient = useQueryClient();
  const fees = useQuery({
    queryKey: ["gold-curve-fees", creator],
    enabled: creator.length > 0,
    queryFn: () => api.goldCurveFees(creator),
    refetchInterval: 20_000,
  });

  const claim = useMutation({
    mutationFn: async (input: { pool: string; kind: "trading" | "surplus" | "locked-lp" }) => {
      if (!wallet.signTransaction || !creator) throw new Error("Connect a Solana wallet");
      const prepared = await api.claimGoldCurve({ creator, pool: input.pool, kind: input.kind });
      return signAndSend(wallet.signTransaction, prepared.solanaTransaction);
    },
    onSuccess: (result) => {
      toast.success("Fees claimed", { description: result.signature });
      void queryClient.invalidateQueries({ queryKey: ["gold-curve-fees", creator] });
    },
    onError: (err) => {
      toast.error("Claim failed", { description: (err as Error).message.slice(0, 160) });
    },
  });

  if (!creator) return null;
  const pools = fees.data?.pools ?? [];
  if (!fees.isLoading && pools.length === 0) return null;

  return (
    <GlassCard variant="strong" padding="lg" className="flex flex-col gap-3">
      <div>
        <p className="font-display text-lg font-bold">Gold Curve fees</p>
        <p className="text-xs text-ink-muted">
          Claim your half of bonding-curve trading fees, leftover surplus, and locked DAMM v2 LP fees. Liquidity stays locked.
        </p>
      </div>
      {fees.isLoading && <p className="text-sm text-ink-muted">Looking up your pools…</p>}
      {pools.map((pool) => (
        <FeeRow
          key={pool.pool}
          pool={pool}
          pending={claim.isPending}
          onClaim={(kind) => claim.mutate({ pool: pool.pool, kind })}
        />
      ))}
    </GlassCard>
  );
}

function FeeRow({
  pool,
  pending,
  onClaim,
}: {
  pool: GoldCurveFeePool;
  pending: boolean;
  onClaim: (kind: "trading" | "surplus" | "locked-lp") => void;
}) {
  const quoteDecimals = pool.quoteSymbol === "USDC" ? 6 : 9;
  const quote = formatRaw(pool.unclaimedQuote, quoteDecimals);
  const base = formatRaw(pool.unclaimedBase, 6);
  const nothing = pool.unclaimedQuote === "0" && pool.unclaimedBase === "0";
  return (
    <div className="glass rounded-2xl p-3">
      <p className="font-bold">
        {pool.symbol ?? pool.mint.slice(0, 4)}{" "}
        <span className="text-xs font-semibold text-ink-muted">{pool.name ?? ""}</span>
      </p>
      <p className="mt-1 text-xs text-ink-muted">
        Unclaimed {quote} {pool.quoteSymbol} and {base} base
        {pool.migrated ? " · graduated" : " · on the curve"}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <GlassButton size="sm" disabled={pending || nothing} onClick={() => onClaim("trading")}>
          Claim trading fees
        </GlassButton>
        <GlassButton size="sm" variant="glass" disabled={pending} onClick={() => onClaim("surplus")}>
          Claim surplus
        </GlassButton>
        <GlassButton size="sm" variant="glass" disabled={pending || !pool.migrated} onClick={() => onClaim("locked-lp")}>
          Claim locked LP fees
        </GlassButton>
      </div>
    </div>
  );
}
