/**
 * Public protocol treasury wallets — no secrets.
 * EVM addresses are identical on all six EVM chains (same mnemonic, paths 0–2).
 * See scripts/generate-protocol-wallets.ts and admin Protocol treasury UI.
 */
export const PROTOCOL_WALLETS = {
  /** Hot wallet that receives FeeCollector withdrawals (EVM). */
  feeCollectorEvm: "0xC0624F22BAd798Bd9236EF0c95E35404614079B6" as const,
  treasuryEvm: "0x2fb7e1544Ab930593d102a928737556cf787ef27" as const,
  operationsEvm: "0x6b16cD6c922F5FA47D27a0cE0d86434597e94b69" as const,
  feeCollectorSolana: "ENobDuF4iGAmF1Y211aLj6gXCNpdHBfnNkUyLDdbUabb" as const,
  treasurySolana: "8u5kYpWmqc1KYeeNs29sTsnrgiAgbG3bJ5LcpxTChD61" as const,
  operationsSolana: "29EwZw8D1oRcT6y1qc7kS8eHSPPdJ6kj2cC1o9qz5Mso" as const,
} as const;
