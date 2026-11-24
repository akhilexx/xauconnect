import assert from "node:assert/strict";
import { test } from "node:test";
import { encodeEventTopics, numberToHex, parseAbiItem, type Address, type Log } from "viem";
import { PublicKey, type ParsedTransactionWithMeta } from "@solana/web3.js";
import { SOLANA_NATIVE_MINT, tokenAddressEq } from "@xauconnect/utils";
import { tokenDelta } from "../src/services/settlement/evm.js";
import { evmFingerprint } from "../src/services/settlement/evidence.js";
import { splDelta, wrappedMovement } from "../src/services/settlement/solana.js";

const wallet="0x0000000000000000000000000000000000000011" as Address;
const asset="0x0000000000000000000000000000000000000022" as Address;
const collector="0x0000000000000000000000000000000000000033" as Address;
const abi=[parseAbiItem("event Transfer(address indexed from,address indexed to,uint256 value)")];
function transfer(from:Address,to:Address,raw:bigint,token=asset):Log {
  return {address:token,topics:encodeEventTopics({abi,eventName:"Transfer",args:{from,to}}),data:numberToHex(raw,{size:32})} as Log;
}
test("ERC-20 accounting uses the exact token and net collector credit",()=>{
  const logs=[transfer(wallet,collector,96000n),transfer(collector,wallet,1000n),transfer(wallet,collector,1000000n,wallet)];
  assert.equal(tokenDelta(logs,asset,collector),95000n);
  assert.equal(tokenDelta(logs,asset,wallet),-95000n);
  assert.equal(tokenDelta([],asset,wallet),0n);
});
test("a build is bound to destination, calldata and native value",()=>{
  const fp=evmFingerprint(asset,"0xaabb",1n);
  assert.equal(fp,evmFingerprint(asset,"0xAABB",1n));
  for(const other of [evmFingerprint(wallet,"0xaabb",1n),evmFingerprint(asset,"0xaabc",1n),evmFingerprint(asset,"0xaabb",0n)])assert.notEqual(other,fp);
});
test("Solana token movements exclude gas, rent and mint lookalikes",()=>{
  const signer=PublicKey.default.toBase58(), mint="Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
  const tx={meta:{fee:5000,preTokenBalances:[],postTokenBalances:[{mint,owner:signer,uiTokenAmount:{amount:"3268563"}}],
    innerInstructions:[{instructions:[{program:"spl-token",parsed:{type:"transfer",info:{amount:"50000000",source:"wrapped",destination:"pool"}}}]}]},
    transaction:{message:{accountKeys:[],instructions:[{program:"spl-associated-token-account",parsed:{type:"createIdempotent",info:{mint:SOLANA_NATIVE_MINT,wallet:signer,account:"wrapped"}}}]}}} as unknown as ParsedTransactionWithMeta;
  assert.equal(wrappedMovement(tx,signer),-50000000n);
  assert.equal(splDelta(tx,signer,mint),3268563n);
  assert.equal(splDelta(tx,signer,mint.toLowerCase()),0n);
  assert.equal(tokenAddressEq("solana",mint,mint.toLowerCase()),false);
});
