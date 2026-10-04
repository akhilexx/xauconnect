/**
 * EVM ERC-20 allowance read helper for agent integrations.
 */
import { normalizeEvmAddress } from "@xauconnect/utils";
import { getChainByKey, NATIVE_TOKEN_ADDRESS } from "@xauconnect/utils";
import { ApiError } from "../middleware/error.js";
import { chainByKeyStrict, evmClient } from "./routing/evm.js";

const ERC20_ALLOWANCE_ABI = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
] as const;

export async function readEvmAllowance(
  chainKey: string,
  token: string,
  owner: string,
  spender: string,
): Promise<string> {
  const chain = getChainByKey(chainKey);
  if (!chain || chain.kind !== "evm") {
    throw new ApiError(400, "Allowance check is EVM-only", "EVM_ONLY");
  }
  if (
    token.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase() ||
    token === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
  ) {
    return "0";
  }
  const tokenNorm = normalizeEvmAddress(token);
  const ownerNorm = normalizeEvmAddress(owner);
  const spenderNorm = normalizeEvmAddress(spender);
  if (!tokenNorm || !ownerNorm || !spenderNorm) {
    throw new ApiError(400, "Invalid token, owner, or spender address", "VALIDATION_ERROR");
  }
  const client = evmClient(chainByKeyStrict(chainKey));
  const allowance = await client.readContract({
    address: tokenNorm,
    abi: ERC20_ALLOWANCE_ABI,
    functionName: "allowance",
    args: [ownerNorm, spenderNorm],
  });
  return allowance.toString();
}
