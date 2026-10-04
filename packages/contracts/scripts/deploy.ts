/**
 * XAUConnect protocol deployment.
 *
 *   pnpm --filter @xauconnect/contracts deploy:sepolia
 *
 * Deploys (UUPS proxies unless noted):
 *   1. FeeCollector
 *   2. AggregatorRouter        + UniswapV2Adapter per configured venue
 *   3. LiquidityZap            (immutable)
 *   4. TokenFactory
 *   5. Launchpad
 *   6. XAUToken                (immutable, mainnet-class chains only)
 *
 * Venue routers per network come from `venues` below — extend it as new
 * chains/DEXes are onboarded (mirror of packages/utils/src/dexes.ts).
 */
import { ethers, upgrades, network } from "hardhat";

/** UniswapV2-family routers to register at deploy time, per network. */
const venues: Record<string, { id: string; router: string }[]> = {
  sepolia: [
    // Uniswap V2 router on Sepolia
    { id: "uniswap-v2", router: "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3" },
  ],
  bscTestnet: [
    // PancakeSwap V2 testnet router
    { id: "pancakeswap-v2", router: "0xD99D1c33F9fC3444f8101754aBC46c52416550D1" },
  ],
  ethereum: [
    { id: "uniswap-v2", router: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D" },
    { id: "sushiswap", router: "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F" },
  ],
  bsc: [
    { id: "pancakeswap-v2", router: "0x10ED43C718714eb63d5aA57B78B54704E256024E" },
    { id: "biswap", router: "0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8" },
  ],
  polygon: [
    { id: "quickswap", router: "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff" },
    { id: "sushiswap", router: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506" },
  ],
  arbitrum: [
    { id: "camelot", router: "0xc873fEcbd354f5A56E00E710B90EF4201db2448d" },
    { id: "sushiswap", router: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506" },
  ],
  base: [
    { id: "aerodrome", router: "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43" },
    { id: "baseswap", router: "0x327Df1E6de05895d2ab08513aaDD9313Fe505d86" },
  ],
  avalanche: [
    { id: "traderjoe", router: "0x60aE616a2155Ee3d9A68541Ba4544862310933d4" },
    { id: "pangolin", router: "0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106" },
  ],
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`\nXAUConnect deploy — network=${network.name} deployer=${deployer.address}`);

  const withdrawalRecipient = process.env.PROTOCOL_FEE_COLLECTOR_EVM?.trim();
  const operationsWallet = process.env.PROTOCOL_OPERATIONS_EVM?.trim();

  // 1. FeeCollector ──────────────────────────────────────────────────────
  const FeeCollector = await ethers.getContractFactory("FeeCollector");
  const feeCollector = await upgrades.deployProxy(FeeCollector, [deployer.address], {
    kind: "uups",
  });
  await feeCollector.waitForDeployment();
  const feeCollectorAddr = await feeCollector.getAddress();
  console.log(`FeeCollector:      ${feeCollectorAddr}`);

  if (withdrawalRecipient && ethers.isAddress(withdrawalRecipient)) {
    await (await feeCollector.setWithdrawalRecipient(withdrawalRecipient)).wait();
    console.log(`  withdrawalRecipient → ${withdrawalRecipient}`);
  } else {
    console.log(
      "  withdrawalRecipient skipped — set PROTOCOL_FEE_COLLECTOR_EVM in .env before deploy",
    );
  }

  if (operationsWallet && ethers.isAddress(operationsWallet)) {
    const withdrawerRole = await feeCollector.WITHDRAWER_ROLE();
    await (await feeCollector.grantRole(withdrawerRole, operationsWallet)).wait();
    console.log(`  WITHDRAWER_ROLE → ${operationsWallet}`);
  }

  // 2. AggregatorRouter + adapters ───────────────────────────────────────
  const AggregatorRouter = await ethers.getContractFactory("AggregatorRouter");
  const router = await upgrades.deployProxy(
    AggregatorRouter,
    [deployer.address, feeCollectorAddr],
    { kind: "uups" },
  );
  await router.waitForDeployment();
  console.log(`AggregatorRouter:  ${await router.getAddress()}`);

  const UniswapV2Adapter = await ethers.getContractFactory("UniswapV2Adapter");
  let graduationRouter = ethers.ZeroAddress;
  for (const venue of venues[network.name] ?? []) {
    const adapter = await UniswapV2Adapter.deploy(venue.router);
    await adapter.waitForDeployment();
    const id = ethers.keccak256(ethers.toUtf8Bytes(venue.id));
    await (await router.setAdapter(id, await adapter.getAddress())).wait();
    if (graduationRouter === ethers.ZeroAddress) graduationRouter = venue.router;
    console.log(`  adapter ${venue.id}: ${await adapter.getAddress()} -> ${venue.router}`);
  }

  // 3. LiquidityZap ──────────────────────────────────────────────────────
  const LiquidityZap = await ethers.getContractFactory("LiquidityZap");
  const zap = await LiquidityZap.deploy(feeCollectorAddr, deployer.address);
  await zap.waitForDeployment();
  for (const venue of venues[network.name] ?? []) {
    await (await zap.setRouterAllowed(venue.router, true)).wait();
  }
  console.log(`LiquidityZap:      ${await zap.getAddress()}`);

  // 4. TokenFactory ──────────────────────────────────────────────────────
  const TokenFactory = await ethers.getContractFactory("TokenFactory");
  const factory = await upgrades.deployProxy(
    TokenFactory,
    [deployer.address, feeCollectorAddr],
    { kind: "uups" },
  );
  await factory.waitForDeployment();
  console.log(`TokenFactory:      ${await factory.getAddress()}`);

  // 5. Launchpad ─────────────────────────────────────────────────────────
  if (graduationRouter !== ethers.ZeroAddress) {
    const Launchpad = await ethers.getContractFactory("Launchpad");
    const launchpad = await upgrades.deployProxy(
      Launchpad,
      [
        deployer.address,
        feeCollectorAddr,
        graduationRouter,
        ethers.parseEther("30"), // virtual native reserve
        ethers.parseEther("85"), // graduation target
      ],
      { kind: "uups" },
    );
    await launchpad.waitForDeployment();
    console.log(`Launchpad:         ${await launchpad.getAddress()}`);
  } else {
    console.log("Launchpad:         skipped (no graduation router for this network)");
  }

  // 6. XAUToken (deploy once on the home chain) ──────────────────────────
  if (["ethereum", "bsc", "sepolia", "bscTestnet", "localhost", "hardhat"].includes(network.name)) {
    const XAUToken = await ethers.getContractFactory("XAUToken");
    const xau = await XAUToken.deploy(deployer.address);
    await xau.waitForDeployment();
    console.log(`XAUToken:          ${await xau.getAddress()}`);
  }

  console.log("\nDone. Record these addresses in your .env / admin dashboard.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
