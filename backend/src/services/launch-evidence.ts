import { VersionedTransaction } from "@solana/web3.js";
import { isAddress, parseAbiItem, parseEventLogs, type Hex } from "viem";
import type { TokenLaunchRequest } from "@xauconnect/utils";
import { cache } from "../cache.js";
import { ApiError } from "../middleware/error.js";
import { withSolanaConnection } from "./solana-rpc.js";
import { chainByKeyStrict, evmClient } from "./routing/evm.js";
import { digest } from "./settlement/evidence.js";

function fingerprint(launch: TokenLaunchRequest, uri: string, message: Uint8Array) {
  return digest(JSON.stringify([launch, uri, digest(message)]));
}
export async function rememberLaunch(
  launch: TokenLaunchRequest,
  mint: string,
  uri: string,
  base64: string,
) {
  const tx = VersionedTransaction.deserialize(Buffer.from(base64, "base64"));
  await cache.set(
    "prepared-launch:" + mint,
    fingerprint(launch, uri, tx.message.serialize()),
    3600,
  );
}
export async function verifyLaunch(
  launch: TokenLaunchRequest,
  mint: string,
  hash: string,
  uri: string,
) {
  const fail = () => new ApiError(422, "Deployment could not be verified", "DEPLOYMENT_UNVERIFIED");
  if (launch.chainKey === "solana") {
    const prepared = await cache.get("prepared-launch:" + mint);
    if (!prepared || !/^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(hash)) throw fail();
    const tx = await withSolanaConnection(async (rpc) => {
      const result = await rpc.getTransaction(hash, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
      if (!result) throw new Error("not visible");
      return result;
    });
    if (
      !tx?.meta ||
      tx.meta.err ||
      tx.transaction.signatures[0] !== hash ||
      prepared !== fingerprint(launch, uri, tx.transaction.message.serialize())
    )
      throw fail();
    return;
  }
  const curve = launch.launchType === "bonding-curve";
  const address =
    process.env[
      (curve ? "LAUNCHPAD_ADDRESS_" : "TOKEN_FACTORY_ADDRESS_") + launch.chainKey.toUpperCase()
    ];
  if (!address || !isAddress(address) || !/^0x[\da-f]{64}$/i.test(hash)) throw fail();
  const receipt = await evmClient(chainByKeyStrict(launch.chainKey)).getTransactionReceipt({
    hash: hash as Hex,
  });
  if (receipt.status !== "success") throw fail();
  const events = parseEventLogs({
    abi: [
      parseAbiItem(
        "event TokenCreated(address indexed token,address indexed creator,string name,string symbol,uint256 totalSupply,string metadataURI,uint256 launchFeePaid)",
      ),
      parseAbiItem(
        "event LaunchCreated(address indexed token,address indexed creator,string name,string symbol,string metadataURI)",
      ),
    ],
    logs: receipt.logs.filter((l) => l.address.toLowerCase() === address.toLowerCase()),
  });
  if (
    !events.some(
      (e) =>
        e.eventName === (curve ? "LaunchCreated" : "TokenCreated") &&
        e.args.creator.toLowerCase() === launch.creator.toLowerCase() &&
        e.args.token.toLowerCase() === mint.toLowerCase() &&
        e.args.metadataURI === uri &&
        e.args.name === launch.name &&
        e.args.symbol === launch.symbol &&
        (e.eventName !== "TokenCreated" ||
          e.args.totalSupply === BigInt(launch.totalSupply) * 10n ** 18n),
    )
  )
    throw fail();
}
