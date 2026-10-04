/**
 * UUPS upgrade FeeCollector implementation (e.g. widen swap fee bounds).
 *
 *   FEE_COLLECTOR_ADDRESS=0x... RPC_POLYGON=... pnpm --filter @xauconnect/contracts upgrade:fee-collector:polygon
 */
import { ethers, network, upgrades } from "hardhat";

async function main() {
  const proxy = process.env.FEE_COLLECTOR_ADDRESS?.trim();
  if (!proxy || !ethers.isAddress(proxy)) {
    throw new Error("Set FEE_COLLECTOR_ADDRESS to the deployed FeeCollector proxy");
  }

  console.log(`Upgrading FeeCollector on ${network.name} proxy=${proxy}`);
  const FeeCollector = await ethers.getContractFactory("FeeCollector");
  const upgraded = await upgrades.upgradeProxy(proxy, FeeCollector);
  await upgraded.waitForDeployment();
  console.log(`FeeCollector upgraded at ${await upgraded.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
