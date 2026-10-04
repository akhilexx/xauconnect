/**
 * Post-deploy: point FeeCollector withdrawals at the protocol fee-collector EVM wallet.
 *
 *   PROTOCOL_FEE_COLLECTOR_EVM=0x... PROTOCOL_OPERATIONS_EVM=0x... \
 *   FEE_COLLECTOR_ADDRESS=0x... pnpm --filter @xauconnect/contracts configure:withdrawals
 *
 * Requires deployer/admin key (DEFAULT_ADMIN_ROLE + optionally grant WITHDRAWER to ops).
 */
import { ethers } from "hardhat";

const FEE_COLLECTOR_ABI = [
  "function setWithdrawalRecipient(address recipient)",
  "function grantRole(bytes32 role, address account)",
  "function WITHDRAWER_ROLE() view returns (bytes32)",
  "function withdrawalRecipient() view returns (address)",
] as const;

async function main() {
  const feeCollectorAddr = process.env.FEE_COLLECTOR_ADDRESS?.trim();
  const recipient = process.env.PROTOCOL_FEE_COLLECTOR_EVM?.trim();
  const operations = process.env.PROTOCOL_OPERATIONS_EVM?.trim();

  if (!feeCollectorAddr || !ethers.isAddress(feeCollectorAddr)) {
    throw new Error("Set FEE_COLLECTOR_ADDRESS to the deployed FeeCollector proxy");
  }
  if (!recipient || !ethers.isAddress(recipient)) {
    throw new Error("Set PROTOCOL_FEE_COLLECTOR_EVM to the protocol fee-collector hot wallet");
  }

  const [signer] = await ethers.getSigners();
  const feeCollector = new ethers.Contract(feeCollectorAddr, FEE_COLLECTOR_ABI, signer);

  const current = await feeCollector.withdrawalRecipient();
  if (current.toLowerCase() !== recipient.toLowerCase()) {
    await (await feeCollector.setWithdrawalRecipient(recipient)).wait();
    console.log(`withdrawalRecipient → ${recipient}`);
  } else {
    console.log(`withdrawalRecipient already ${recipient}`);
  }

  if (operations && ethers.isAddress(operations)) {
    const withdrawerRole = await feeCollector.WITHDRAWER_ROLE();
    await (await feeCollector.grantRole(withdrawerRole, operations)).wait();
    console.log(`WITHDRAWER_ROLE granted → ${operations}`);
  }

  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
