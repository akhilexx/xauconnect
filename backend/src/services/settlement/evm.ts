import { parseAbiItem, parseEventLogs, type Hex, type Log } from "viem";
import { chainByKeyStrict, evmClient } from "../routing/evm.js";
import { evmFingerprint, native, requireEvidence, type Evidence, type Ticket } from "./evidence.js";
import { routerAddressFor } from "../routing/executable.js";

const transfer = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);
const executed = parseAbiItem(
  "event SwapExecuted(bytes32 indexed adapterId,address indexed user,address tokenIn,address tokenOut,uint256 amountIn,uint256 protocolFee,uint256 amountOut)",
);
const feeReceived = parseAbiItem(
  "event FeeReceived(uint8 indexed kind,address indexed token,uint256 amount,address payer)",
);
const eq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export function tokenDelta(logs: Log[], token: string, owner: string) {
  return parseEventLogs({ abi: [transfer], logs: logs.filter((l) => eq(l.address, token)) }).reduce(
    (n, { args: a }) => n + (eq(a.to, owner) ? a.value : 0n) - (eq(a.from, owner) ? a.value : 0n),
    0n,
  );
}

type Call = {
  type: string;
  from: string;
  to?: string;
  value?: Hex;
  input?: Hex;
  error?: string;
  calls?: Call[];
  logs?: Log[];
};
const entryPoints = new Set([
  "0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789",
  "0x0000000071727de22e5e9d8baf0edac6f37da032",
]);
const operation = parseAbiItem(
  "event UserOperationEvent(bytes32 indexed userOpHash,address indexed sender,address indexed paymaster,uint256 nonce,bool success,uint256 actualGasCost,uint256 actualGasUsed)",
);
function successfulCalls(root: Call): Call[] {
  return root.error ? [] : [root, ...(root.calls ?? []).flatMap(successfulCalls)];
}
const polygonTransfer = parseAbiItem(
  "event LogTransfer(address indexed token,address indexed from,address indexed to,uint256 amount,uint256 input1,uint256 input2,uint256 output1,uint256 output2)",
);
function polygonCoinDelta(logs: Log[], owner: string) {
  const coin = "0x0000000000000000000000000000000000001010";
  return parseEventLogs({
    abi: [polygonTransfer],
    logs: logs.filter((l) => eq(l.address, coin)),
  }).reduce(
    (n, { args: a }) =>
      eq(a.token, coin)
        ? n + (eq(a.to, owner) ? a.amount : 0n) - (eq(a.from, owner) ? a.amount : 0n)
        : n,
    0n,
  );
}
// Count actual CALL value movements, omitting reverted subtrees and delegatecall values.
function nativeDelta(call: Call, owner: string): bigint {
  if (call.error) return 0n;
  const value = /^(CALL|CREATE2?|SELFDESTRUCT)$/i.test(call.type) ? BigInt(call.value ?? 0) : 0n;
  return (
    (call.to && eq(call.to, owner) ? value : 0n) -
    (eq(call.from, owner) ? value : 0n) +
    (call.calls ?? []).reduce((n, child) => n + nativeDelta(child, owner), 0n)
  );
}

export async function verifyEvm(t: Ticket): Promise<Evidence> {
  const hash = t.txHash as Hex;
  const chain = chainByKeyStrict(t.chainKey);
  const rpc = evmClient(chain);
  const [id, receipt, tx, finalized] = await Promise.all([
    rpc.getChainId(),
    rpc.getTransactionReceipt({ hash }),
    rpc.getTransaction({ hash }),
    rpc.getBlock({ blockTag: "finalized" }),
  ]);
  if (id !== chain.id || receipt.blockNumber > finalized.number)
    throw new Error("awaiting_finality");
  const block = await rpc.getBlock({ blockNumber: receipt.blockNumber });
  if (block.hash !== receipt.blockHash || tx.blockHash !== block.hash)
    throw new Error("canonical_block_pending");
  requireEvidence(receipt.status === "success", "reverted");
  requireEvidence(tx.to, "build_mismatch");
  let destination: string = tx.to,
    logs: Log[] = receipt.logs,
    scoped: Call | undefined;
  const readTrace = async (withLog: boolean) =>
    (await rpc.request({
      method: "debug_traceTransaction",
      params: [hash, { tracer: "callTracer", timeout: "6s", tracerConfig: { withLog } }],
    } as never)) as Call;
  if (!eq(tx.from, t.taker) || evmFingerprint(tx.to, tx.input, tx.value) !== t.fingerprint) {
    // Smart wallets broadcast through an EntryPoint. Isolate the exact inner call;
    // transfers or gas movements in sibling operations cannot earn protocol credit.
    requireEvidence(entryPoints.has(tx.to.toLowerCase()), "build_mismatch");
    const ops = parseEventLogs({
      abi: [operation],
      logs: receipt.logs.filter((l) => eq(l.address, tx.to!)),
    });
    requireEvidence(
      ops.some((o) => o.args.success && eq(o.args.sender, t.taker)),
      "operation_mismatch",
    );
    const trace = await readTrace(true);
    const matches = successfulCalls(trace).filter(
      (c) =>
        c.type === "CALL" &&
        c.to &&
        c.input &&
        eq(c.from, t.taker) &&
        evmFingerprint(c.to, c.input, BigInt(c.value ?? 0)) === t.fingerprint,
    );
    requireEvidence(matches.length === 1, "build_mismatch");
    scoped = matches[0]!;
    destination = scoped.to!;
    logs = successfulCalls(scoped).flatMap((c) => c.logs ?? []);
    if (!logs.length) throw new Error("scoped_logs_unavailable");
  }
  const router = routerAddressFor(t.chainKey);
  let amountIn: bigint, amountOut: bigint, fee: bigint, feeToken: string;
  if (router && eq(destination, router)) {
    const events = parseEventLogs({
      abi: [executed],
      logs: logs.filter((l) => eq(l.address, router)),
    });
    const e = events[0]?.args;
    requireEvidence(
      events.length === 1 &&
        e &&
        eq(e.user, t.taker) &&
        eq(e.tokenIn, t.tokenIn) &&
        eq(e.tokenOut, t.tokenOut),
      "router_event_mismatch",
    );
    amountIn = e.amountIn;
    amountOut = e.amountOut;
    feeToken = t.tokenIn;
    const collector = await rpc.readContract({
      address: router,
      abi: [parseAbiItem("function feeCollector() view returns (address)")],
      functionName: "feeCollector",
      blockNumber: block.number,
    });
    const credit = parseEventLogs({
      abi: [feeReceived],
      logs: logs.filter((l) => eq(l.address, collector)),
    }).filter(
      ({ args: a }) =>
        a.kind === 0 &&
        eq(a.payer, t.taker) &&
        eq(a.token, t.tokenIn) &&
        a.amount === e.protocolFee,
    );
    requireEvidence(credit.length === 1, "collector_event_mismatch");
    fee = native(t.tokenIn) ? e.protocolFee : tokenDelta(logs, t.tokenIn, collector);
    requireEvidence(fee >= 0n && fee <= e.protocolFee, "ambiguous_fee");
  } else {
    let trace = scoped;
    if (!trace && t.chainKey !== "polygon" && (native(t.tokenIn) || native(t.tokenOut))) {
      // An internal native payout or refund cannot be measured from ERC-20 logs.
      trace = await readTrace(false);
      if (!trace?.to || !eq(trace.to, tx.to) || !eq(trace.from, tx.from))
        throw new Error("trace_unavailable");
    }
    const delta = (asset: string, owner: string) =>
      native(asset)
        ? trace
          ? nativeDelta(trace, owner)
          : polygonCoinDelta(logs, owner)
        : tokenDelta(logs, asset, owner);
    amountIn = -delta(t.tokenIn, t.taker);
    amountOut = delta(t.tokenOut, t.taker);
    const inputFee = delta(t.tokenIn, t.feeRecipient),
      outputFee = delta(t.tokenOut, t.feeRecipient);
    requireEvidence(inputFee >= 0n && outputFee >= 0n && !(inputFee && outputFee), "ambiguous_fee");
    feeToken = inputFee > 0n ? t.tokenIn : t.tokenOut;
    fee = inputFee + outputFee;
  }
  return {
    amountIn,
    amountOut,
    fee,
    feeToken,
    time: new Date(Number(block.timestamp) * 1000),
    blockRef: block.hash,
  };
}
