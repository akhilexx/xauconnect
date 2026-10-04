import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import * as dotenv from "dotenv";
import path from "path";

// Env is shared from the repo root.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const accounts = DEPLOYER_KEY ? [DEPLOYER_KEY] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true, // LiquidityZap.addLiquidity needs IR pipeline (stack depth)
    },
  },
  networks: {
    hardhat: {},
    localhost: { url: "http://127.0.0.1:8545" },
    // ── Testnets ─────────────────────────────────────────────────────────
    sepolia: {
      url: process.env.RPC_SEPOLIA ?? "https://ethereum-sepolia-rpc.publicnode.com",
      accounts,
    },
    bscTestnet: {
      url: process.env.RPC_BSC_TESTNET ?? "https://data-seed-prebsc-1-s1.binance.org:8545",
      accounts,
    },
    baseSepolia: {
      url: process.env.RPC_BASE_SEPOLIA ?? "https://sepolia.base.org",
      accounts,
    },
    // ── Mainnets (use with extreme care; see README mainnet checklist) ───
    ethereum: { url: process.env.RPC_ETHEREUM ?? "https://eth.llamarpc.com", accounts },
    bsc: { url: process.env.RPC_BSC ?? "https://bsc-dataseed.binance.org", accounts },
    polygon: { url: process.env.RPC_POLYGON ?? "https://polygon-rpc.com", accounts },
    arbitrum: { url: process.env.RPC_ARBITRUM ?? "https://arb1.arbitrum.io/rpc", accounts },
    base: { url: process.env.RPC_BASE ?? "https://mainnet.base.org", accounts },
    avalanche: {
      url: process.env.RPC_AVALANCHE ?? "https://api.avax.network/ext/bc/C/rpc",
      accounts,
    },
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY ?? "",
      sepolia: process.env.ETHERSCAN_API_KEY ?? "",
      bsc: process.env.BSCSCAN_API_KEY ?? "",
      bscTestnet: process.env.BSCSCAN_API_KEY ?? "",
    },
  },
  gasReporter: { enabled: process.env.REPORT_GAS === "true" },
  mocha: { timeout: 120_000 },
};

export default config;
