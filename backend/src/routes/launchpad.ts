/**
 * Launchpad routes — token launch preparation, recording, and feeds.
 *
 * The actual deployment happens client-side (the creator's wallet calls
 * TokenFactory.createToken / Launchpad.createLaunch). The backend:
 *   - validates + stores launch metadata
 *   - pins metadata JSON to IPFS (web3.storage) when a token is configured
 *   - records deployments for discovery auto-listing
 */
import { Router } from "express";
import { z } from "zod";
import { PublicKey } from "@solana/web3.js";
import { deriveDbcPoolAddress } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { TokenLaunchRequestSchema, type TokenLaunchRequest } from "@xauconnect/utils";
import { env } from "../config.js";
import { db } from "../db/client.js";
import { asyncHandler, validate, ApiError } from "../middleware/error.js";
import { standardLimiter } from "../middleware/rate-limit.js";
import { logger } from "../logger.js";
import { publishLaunch } from "../ws/server.js";
import { upsertIndexedPool } from "../indexer/db/pools.js";
import { GOLD_CURVE_DECIMALS, goldCurveConfigAddress, quoteMintFor } from "../services/gold-curve.js";
import {
  buildCreatorClaim,
  cachedGoldCurveMetadata,
  creatorFeePools,
  goldCurveState,
  prepareGoldCurvePool,
  rememberGoldCurveMetadata,
} from "../services/meteora-dbc.js";

export const launchpadRouter = Router();
launchpadRouter.use(standardLimiter);

function walletAddress(chainKey: string, address: string): string {
  return chainKey === "solana" ? address : address.toLowerCase();
}

function supplyBaseUnits(launch: TokenLaunchRequest): string {
  const decimals = launch.chainKey === "solana" ? GOLD_CURVE_DECIMALS : 18;
  const whole = launch.chainKey === "solana" && launch.launchType === "bonding-curve" ? "1000000000" : launch.totalSupply;
  return `${whole}${"0".repeat(decimals)}`;
}

/**
 * Pin launch metadata JSON to IPFS. Falls back to an inline data URI in demo
 * mode so the flow completes without a WEB3_STORAGE_TOKEN.
 */
async function pinMetadata(metadata: Record<string, unknown>): Promise<string> {
  if (env.WEB3_STORAGE_TOKEN) {
    try {
      // nft.storage-compatible simple upload endpoint.
      const res = await fetch("https://api.nft.storage/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.WEB3_STORAGE_TOKEN}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(metadata),
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        if (data?.value?.cid) return `ipfs://${data.value.cid}`;
      }
      logger.warn({ status: res.status }, "ipfs pin failed — using data URI");
    } catch (err) {
      logger.warn({ err: (err as Error).message }, "ipfs pin failed — using data URI");
    }
  }
  const encoded = Buffer.from(JSON.stringify(metadata)).toString("base64");
  return `data:application/json;base64,${encoded}`;
}

/**
 * Step 1 — prepare a launch: validates input, pins metadata, returns the
 * metadataURI + contract call parameters for the wallet to execute.
 */
launchpadRouter.post(
  "/prepare",
  asyncHandler(async (req, res) => {
    const launch = validate(TokenLaunchRequestSchema, req.body);

    const metadata = {
      name: launch.name,
      symbol: launch.symbol,
      description: launch.description,
      image: launch.logoIpfsCid ? `ipfs://${launch.logoIpfsCid}` : undefined,
      external_url: launch.website || undefined,
      socials: { twitter: launch.twitter, telegram: launch.telegram },
      launchType: launch.launchType,
      platform: "XAUConnect",
      curvePreset: launch.curvePreset,
      quote: launch.quote,
    };

    if (launch.chainKey === "solana") {
      if (launch.launchType !== "bonding-curve") {
        throw new ApiError(400, "Solana launches use a Gold Curve", "SOLANA_CURVE_REQUIRED");
      }
      if (!launch.curvePreset || !launch.quote) {
        throw new ApiError(400, "Choose a Gold Curve preset and a SOL or USDC quote", "CURVE_PRESET_REQUIRED");
      }
      if (launch.name.trim().length > 32 || launch.symbol.length > 10) {
        throw new ApiError(400, "Solana token name must be 32 characters or fewer and the symbol 10 or fewer", "METAPLEX_LIMIT");
      }
      let prepared;
      try {
        prepared = await prepareGoldCurvePool({
          preset: launch.curvePreset,
          quote: launch.quote,
          creator: launch.creator,
          name: launch.name.trim(),
          symbol: launch.symbol,
          firstBuyAmount: launch.firstBuyAmount,
        });
      } catch (err) {
        const message = (err as Error).message;
        if (message === "GOLD_CURVE_CONFIG_MISSING") {
          throw new ApiError(503, "Gold Curve configs are not on this server yet", "GOLD_CURVE_CONFIG_MISSING");
        }
        logger.warn({ err: message }, "gold curve prepare failed");
        throw new ApiError(400, message.slice(0, 180), "GOLD_CURVE_PREPARE_FAILED");
      }

      const metadataURI = prepared.metadataUrl;
      rememberGoldCurveMetadata(prepared.mint, { ...metadata, image: metadata.image });
      if (db) {
        await db.token.upsert({
          where: { chainKey_address: { chainKey: "solana", address: prepared.mint } },
          update: {
            name: launch.name.trim(),
            symbol: launch.symbol,
            decimals: GOLD_CURVE_DECIMALS,
            description: launch.description,
            website: launch.website || null,
            twitter: launch.twitter || null,
            telegram: launch.telegram || null,
            logoURI: launch.logoIpfsCid ? `https://ipfs.io/ipfs/${launch.logoIpfsCid}` : null,
            metadataURI,
            creatorAddress: launch.creator,
          },
          create: {
            chainKey: "solana",
            address: prepared.mint,
            symbol: launch.symbol,
            name: launch.name.trim(),
            decimals: GOLD_CURVE_DECIMALS,
            metadataURI,
            description: launch.description,
            website: launch.website || null,
            twitter: launch.twitter || null,
            telegram: launch.telegram || null,
            logoURI: launch.logoIpfsCid ? `https://ipfs.io/ipfs/${launch.logoIpfsCid}` : null,
            xauLaunch: false,
            creatorAddress: launch.creator,
            listingStatus: "UNLISTED",
          },
        });
      }

      res.json({
        metadataURI,
        contractCall: {
          contract: "MeteoraDbc",
          method: "createPool",
          args: [prepared.mint, prepared.pool, prepared.config],
        },
        feeCurrency: launch.quote === "usdc" ? "usdc" : "native",
        solanaTransaction: prepared.solanaTransaction,
        mint: prepared.mint,
        pool: prepared.pool,
        config: prepared.config,
        quoteMint: prepared.quoteMint,
      });
      return;
    }

    const metadataURI = await pinMetadata(metadata);

    // 18-decimals supply in base units for the contract call.
    const totalSupplyBaseUnits = supplyBaseUnits(launch);

    res.json({
      metadataURI,
      contractCall:
        launch.launchType === "bonding-curve"
          ? {
              contract: "Launchpad",
              method: "createLaunch",
              args: [launch.name, launch.symbol, metadataURI],
            }
          : {
              contract: "TokenFactory",
              method: "createToken",
              args: [launch.name, launch.symbol, totalSupplyBaseUnits, metadataURI],
            },
      feeCurrency: launch.feeCurrency,
    });
  }),
);

const RecordSchema = z.object({
  launch: TokenLaunchRequestSchema,
  tokenAddress: z.string(),
  deployTxHash: z.string(),
  metadataURI: z.string(),
});

/** Step 2 — record a confirmed deployment; auto-lists on Discover. */
launchpadRouter.post(
  "/record",
  asyncHandler(async (req, res) => {
    const { launch, tokenAddress, deployTxHash, metadataURI } = validate(RecordSchema, req.body);

    const creatorAddress = walletAddress(launch.chainKey, launch.creator);
    const tokenAddressNorm = walletAddress(launch.chainKey, tokenAddress);
    const solanaCurve = launch.chainKey === "solana" && launch.launchType === "bonding-curve";
    let poolAddress: string | null = null;
    let configAddress: string | null = null;
    let quoteMint: string | null = null;
    if (solanaCurve && launch.curvePreset && launch.quote) {
      configAddress = goldCurveConfigAddress(launch.curvePreset, launch.quote);
      quoteMint = quoteMintFor(launch.quote);
      if (configAddress) {
        poolAddress = deriveDbcPoolAddress(
          new PublicKey(quoteMint),
          new PublicKey(tokenAddressNorm),
          new PublicKey(configAddress),
        ).toBase58();
      }
    }

    // Push to the live "launches" stream immediately, even in demo mode.
    publishLaunch({
      chainKey: launch.chainKey,
      address: tokenAddressNorm,
      symbol: launch.symbol,
      name: launch.name,
      priceUsd: 0,
      change24hPct: 0,
      volume24hUsd: 0,
      liquidityUsd: 0,
      holders: 1,
      logoURI: launch.logoIpfsCid ? `https://ipfs.io/ipfs/${launch.logoIpfsCid}` : undefined,
      createdAt: Date.now(),
      xauLaunch: true,
      auditBadge: "pending",
    });

    if (!db) {
      res.json({ ok: true, persisted: false });
      return;
    }

    const creator = await db.user.upsert({
      where: { address: creatorAddress },
      update: {
        lastSeenAt: new Date(),
        ...(launch.chainKey === "solana" ? { chainKind: "solana" } : {}),
      },
      create: {
        address: creatorAddress,
        chainKind: launch.chainKey === "solana" ? "solana" : "evm",
      },
    });

    const token = await db.token.upsert({
      where: { chainKey_address: { chainKey: launch.chainKey, address: tokenAddressNorm } },
      update: {
        xauLaunch: true,
        listingStatus: "APPROVED",
        metadataURI,
        creatorAddress,
        ...(solanaCurve ? { decimals: GOLD_CURVE_DECIMALS } : {}),
      },
      create: {
        chainKey: launch.chainKey,
        address: tokenAddressNorm,
        symbol: launch.symbol,
        name: launch.name,
        decimals: solanaCurve ? GOLD_CURVE_DECIMALS : 18,
        metadataURI,
        description: launch.description,
        website: launch.website || null,
        twitter: launch.twitter || null,
        telegram: launch.telegram || null,
        logoURI: launch.logoIpfsCid ? `https://ipfs.io/ipfs/${launch.logoIpfsCid}` : null,
        xauLaunch: true,
        creatorAddress,
        listingStatus: "APPROVED",
      },
    });

    await db.launch.upsert({
      where: { tokenId: token.id },
      update: {
        status: "DEPLOYED",
        deployTxHash,
        poolAddress,
        configAddress,
        quoteMint,
        curvePreset: launch.curvePreset ?? null,
        lpLocked: solanaCurve ? true : launch.lockLiquidity,
      },
      create: {
        tokenId: token.id,
        creatorId: creator.id,
        launchType: launch.launchType === "bonding-curve" ? "BONDING_CURVE" : "STANDARD",
        status: "DEPLOYED",
        totalSupply: supplyBaseUnits(launch),
        feeCurrency: solanaCurve ? (launch.quote === "usdc" ? "usdc" : "native") : launch.feeCurrency,
        deployTxHash,
        lpLocked: solanaCurve ? true : launch.lockLiquidity,
        lockDurationDays: solanaCurve ? 0 : launch.lockDurationDays,
        poolAddress,
        configAddress,
        quoteMint,
        curvePreset: launch.curvePreset ?? null,
      },
    });

    if (solanaCurve && poolAddress && quoteMint) {
      await upsertIndexedPool({
        chainKey: "solana",
        dexKey: "meteora-dbc",
        poolAddress,
        token0Address: tokenAddressNorm,
        token1Address: quoteMint,
        baseTokenAddress: tokenAddressNorm,
        token0Symbol: launch.symbol,
        token1Symbol: launch.quote === "usdc" ? "USDC" : "SOL",
        creatorAddress,
      });
    }

    res.json({ ok: true, persisted: true, tokenId: token.id });
  }),
);

/** Launch feed for the launchpad page. */
launchpadRouter.get(
  "/launches",
  asyncHandler(async (_req, res) => {
    if (!db) {
      res.json({ launches: [] });
      return;
    }
    const launches = await db.launch.findMany({
      include: { token: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({
      launches: launches.map((l) => ({
        id: l.id,
        type: l.launchType,
        status: l.status,
        createdAt: l.createdAt,
        token: {
          chainKey: l.token.chainKey,
          address: l.token.address,
          symbol: l.token.symbol,
          name: l.token.name,
          logoURI: l.token.logoURI,
        },
      })),
    });
  }),
);

/** Listing fee request for external (non-XAU-launched) tokens. */
const ListingSchema = z.object({
  chainKey: z.string(),
  address: z.string(),
  symbol: z.string(),
  name: z.string(),
  paymentTxHash: z.string(),
});

launchpadRouter.post(
  "/listing-request",
  asyncHandler(async (req, res) => {
    const data = validate(ListingSchema, req.body);
    if (!db) throw new ApiError(503, "Listing queue requires the database", "NO_DB");
    const token = await db.token.upsert({
      where: { chainKey_address: { chainKey: data.chainKey, address: data.address } },
      update: { listingStatus: "PENDING", listingFeePaidTx: data.paymentTxHash },
      create: {
        chainKey: data.chainKey,
        address: data.address,
        symbol: data.symbol,
        name: data.name,
        listingStatus: "PENDING",
        listingFeePaidTx: data.paymentTxHash,
      },
    });
    res.json({ ok: true, tokenId: token.id, status: token.listingStatus });
  }),
);

/** Metaplex metadata. The on-chain URI points here so it stays under 200 characters. */
launchpadRouter.get(
  "/meta/:mint",
  asyncHandler(async (req, res) => {
    const mint = req.params.mint;
    if (!mint) throw new ApiError(400, "Missing mint", "BAD_MINT");
    const cached = cachedGoldCurveMetadata(mint);
    if (cached) {
      res.json(cached);
      return;
    }
    if (!db) throw new ApiError(404, "Metadata not found", "NO_METADATA");
    const token = await db.token.findUnique({
      where: { chainKey_address: { chainKey: "solana", address: mint } },
    });
    if (!token) throw new ApiError(404, "Metadata not found", "NO_METADATA");
    res.json({
      name: token.name,
      symbol: token.symbol,
      description: token.description ?? "",
      image: token.logoURI ?? undefined,
      external_url: token.website ?? undefined,
      socials: { twitter: token.twitter, telegram: token.telegram },
      platform: "XAUConnect",
    });
  }),
);

/** Live curve phase, fee clock, and locked-LP terms for a Gold Curve mint. */
launchpadRouter.get(
  "/curve/:mint",
  asyncHandler(async (req, res) => {
    const mint = req.params.mint;
    if (!mint) throw new ApiError(400, "Missing mint", "BAD_MINT");
    const curve = await goldCurveState(mint);
    res.json({ curve });
  }),
);

/** Unclaimed creator trading fees across that wallet's Gold Curve pools. */
launchpadRouter.get(
  "/fees",
  asyncHandler(async (req, res) => {
    const creator = validate(z.string().min(32).max(64), req.query.creator);
    const pools = await creatorFeePools(creator);
    res.json({ pools });
  }),
);

const ClaimSchema = z.object({
  creator: z.string().min(32).max(64),
  pool: z.string().min(32).max(64),
  kind: z.enum(["trading", "surplus", "locked-lp"]),
});

/** Unsigned claim transaction. The creator wallet signs it and submits via /swap/submit-solana. */
launchpadRouter.post(
  "/claim",
  asyncHandler(async (req, res) => {
    const body = validate(ClaimSchema, req.body);
    try {
      const solanaTransaction = await buildCreatorClaim(body);
      res.json({ solanaTransaction });
    } catch (err) {
      const message = (err as Error).message;
      throw new ApiError(400, message.slice(0, 180), "GOLD_CURVE_CLAIM_FAILED");
    }
  }),
);
