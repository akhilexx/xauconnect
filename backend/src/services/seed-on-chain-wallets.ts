/**
 * Register on-chain FeeCollector contract addresses in the admin wallet registry.
 */
import type { PrismaClient } from "@prisma/client";
import { CHAIN_KEYS } from "@xauconnect/utils";
import { feeCollectorAddressFor } from "./fee-collector-onchain.js";

export async function seedOnChainFeeCollectors(client: PrismaClient): Promise<void> {
  for (const chainKey of CHAIN_KEYS) {
    if (chainKey === "solana") continue;
    const address = feeCollectorAddressFor(chainKey);
    if (!address) continue;

    const normalized = address.toLowerCase();
    await client.adminWallet.upsert({
      where: { chainKey_address: { chainKey, address: normalized } },
      update: {
        label: `On-chain FeeCollector (${chainKey})`,
        purpose: "on_chain_vault",
        keyRef: `${chainKey}-fee_collector_contract`,
        walletGroup: "contract",
        notes:
          "Smart contract vault — router swap fees accrue here until ops sweeps to the hot fee-collector wallet.",
      },
      create: {
        chainKey,
        address: normalized,
        label: `On-chain FeeCollector (${chainKey})`,
        purpose: "on_chain_vault",
        keyRef: `${chainKey}-fee_collector_contract`,
        walletGroup: "contract",
        notes:
          "Smart contract vault — router swap fees accrue here until ops sweeps to the hot fee-collector wallet.",
        createdBy: "seed:on-chain-fee-collector",
      },
    });
  }
}
