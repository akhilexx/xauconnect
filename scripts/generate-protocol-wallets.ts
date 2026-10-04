#!/usr/bin/env tsx
/**
 * Generate protocol treasury / fee-collector / operations wallets for all chains.
 *
 * Outputs:
 *   .local/protocol-wallets-SECRETS.txt  — mnemonics + private keys (NEVER commit)
 *   .local/protocol-wallets-public.json  — addresses + metadata for DB seeding
 *
 * Usage: pnpm protocol:wallets:generate
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { generateMnemonic, english, privateKeyToAccount } from "viem/accounts";
import { toHex } from "viem";
import { mnemonicToSeedSync } from "@scure/bip39";
import { HDKey } from "@scure/bip32";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOCAL = join(ROOT, ".local");
const SECRETS_FILE = join(LOCAL, "protocol-wallets-SECRETS.txt");
const PUBLIC_FILE = join(LOCAL, "protocol-wallets-public.json");

const EVM_CHAINS = ["ethereum", "bsc", "polygon", "arbitrum", "base", "avalanche"] as const;
const SOLANA_CHAIN = "solana" as const;
const PURPOSES = ["treasury", "fee_collector", "operations"] as const;

type Purpose = (typeof PURPOSES)[number];

interface KeyBundle {
  keyRef: string;
  purpose: Purpose;
  walletGroup: "evm" | "solana";
  derivationPath: string;
  address: string;
  privateKey: string;
  mnemonic?: string;
  label: string;
  chains: string[];
}

function purposeLabel(purpose: Purpose): string {
  return purpose.replace("_", " ");
}

function main() {
  if (existsSync(SECRETS_FILE)) {
    console.error(`Refusing to overwrite existing secrets file:\n  ${SECRETS_FILE}`);
    console.error("Rename or delete it first if you intend to rotate keys.");
    process.exit(1);
  }

  mkdirSync(LOCAL, { recursive: true });

  const bundles: KeyBundle[] = [];

  const evmMnemonic = generateMnemonic(english);
  const evmSeed = mnemonicToSeedSync(evmMnemonic);

  PURPOSES.forEach((purpose, index) => {
    const path = `m/44'/60'/0'/0/${index}`;
    const hd = HDKey.fromMasterSeed(evmSeed).derive(path);
    if (!hd.privateKey) throw new Error(`Failed to derive EVM key for ${purpose}`);
    const privateKey = toHex(hd.privateKey);
    const account = privateKeyToAccount(privateKey);
    bundles.push({
      keyRef: `evm-${purpose}`,
      purpose,
      walletGroup: "evm",
      derivationPath: path,
      address: account.address,
      privateKey,
      mnemonic: evmMnemonic,
      label: `Protocol ${purposeLabel(purpose)} (EVM)`,
      chains: [...EVM_CHAINS],
    });
  });

  PURPOSES.forEach((purpose, index) => {
    const kp = Keypair.generate();
    const secret = bs58.encode(kp.secretKey);
    bundles.push({
      keyRef: `sol-${purpose}`,
      purpose,
      walletGroup: "solana",
      derivationPath: `solana-keypair/${index}`,
      address: kp.publicKey.toBase58(),
      privateKey: secret,
      label: `Protocol ${purposeLabel(purpose)} (Solana)`,
      chains: [SOLANA_CHAIN],
    });
  });

  const generatedAt = new Date().toISOString();
  const lines: string[] = [
    "=".repeat(80),
    "XAUConnect Protocol Wallets — CONFIDENTIAL",
    `Generated: ${generatedAt}`,
    "DO NOT COMMIT — backup offline (password manager + paper in secure location)",
    "=".repeat(80),
    "",
    "SUMMARY",
    "-".repeat(80),
    `EVM chains (${EVM_CHAINS.length}): one address per purpose, shared across all EVM networks`,
    `Solana: separate keypair per purpose (${PURPOSES.length} wallets)`,
    "",
  ];

  const evmBundle = bundles.find((b) => b.keyRef === "evm-treasury");
  if (evmBundle?.mnemonic) {
    lines.push(
      "─".repeat(80),
      "EVM MASTER MNEMONIC (BIP39 — backs all EVM treasury / fee / ops addresses)",
      "─".repeat(80),
      evmBundle.mnemonic,
      "",
    );
  }

  for (const b of bundles) {
    lines.push(
      "─".repeat(80),
      `${b.label.toUpperCase()}  [${b.keyRef}]`,
      "─".repeat(80),
      `Purpose:         ${b.purpose}`,
      `Wallet group:    ${b.walletGroup}`,
      `Derivation:      ${b.derivationPath}`,
      `Chains:          ${b.chains.join(", ")}`,
      `Address:         ${b.address}`,
      `Private key:     ${b.privateKey}`,
      "",
    );
  }

  lines.push(
    "=".repeat(80),
    "NEXT STEPS",
    "1. Store this file offline — never push to git (.local/ is gitignored)",
    "2. Run: pnpm protocol:wallets:seed  (registers public addresses in admin treasury)",
    "3. Fund each address with native gas on its chain(s) before going live",
    "4. Point on-chain FeeCollector withdrawer to the fee_collector EVM address",
    "=".repeat(80),
    "",
  );

  writeFileSync(SECRETS_FILE, lines.join("\n"), { mode: 0o600 });

  const registry: Array<{
    chainKey: string;
    address: string;
    purpose: Purpose;
    label: string;
    keyRef: string;
    derivationPath: string;
    walletGroup: string;
    notes: string;
  }> = [];

  for (const b of bundles) {
    for (const chainKey of b.chains) {
      registry.push({
        chainKey,
        address: b.walletGroup === "evm" ? b.address.toLowerCase() : b.address,
        purpose: b.purpose,
        label: b.label,
        keyRef: b.keyRef,
        derivationPath: b.derivationPath,
        walletGroup: b.walletGroup,
        notes: `Registered ${generatedAt.slice(0, 10)} — secrets in .local/protocol-wallets-SECRETS.txt`,
      });
    }
  }

  const publicDoc = {
    generatedAt,
    evmChains: EVM_CHAINS,
    solanaChain: SOLANA_CHAIN,
    purposes: PURPOSES,
    bundles: bundles.map(({ privateKey: _pk, mnemonic: _mn, ...rest }) => rest),
    registry,
    feeCollectorEvmAddress: bundles.find((b) => b.keyRef === "evm-fee_collector")?.address,
    treasuryEvmAddress: bundles.find((b) => b.keyRef === "evm-treasury")?.address,
    operationsEvmAddress: bundles.find((b) => b.keyRef === "evm-operations")?.address,
  };

  writeFileSync(PUBLIC_FILE, JSON.stringify(publicDoc, null, 2) + "\n", { mode: 0o644 });

  console.log(`Wrote secrets: ${SECRETS_FILE}`);
  console.log(`Wrote public registry: ${PUBLIC_FILE}`);
  console.log("");
  console.log("EVM addresses (shared on all EVM chains):");
  for (const b of bundles.filter((x) => x.walletGroup === "evm")) {
    console.log(`  ${b.purpose.padEnd(16)} ${b.address}`);
  }
  console.log("");
  console.log("Solana addresses:");
  for (const b of bundles.filter((x) => x.walletGroup === "solana")) {
    console.log(`  ${b.purpose.padEnd(16)} ${b.address}`);
  }
  console.log("");
  console.log("Run: pnpm protocol:wallets:seed");
}

main();
