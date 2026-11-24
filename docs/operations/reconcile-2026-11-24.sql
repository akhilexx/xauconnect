-- Reviewed legacy receipts only. Keep the original report, ignore every reported
-- amount/status/fee. Safe to repeat; a matching historical hash must already exist.
-- Historical USD marks: see SWAP_SETTLEMENT.md. Amounts below are raw token units.
BEGIN;
WITH evidence(chain,hash,wallet,venue,asset_in,asset_out,amt_in,amt_out,fee_token,fee,bps,volume_usd,fee_usd,block_ref,epoch) AS (VALUES
('polygon','0x4665f0e4423642b251d90cbe1310c5c445ff95ea82eccc9bca889be1a4bef202','0x0c1cf77dacf4a798e42fba086c4eb2067c05c6ee','0x-polygon',
'0xc2132d05d31c914a87c6611c10748aeb04b58e8f','0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',3200000::numeric,40283306013174665333::numeric,
'0xc2132d05d31c914a87c6611c10748aeb04b58e8f',96000,300,3.2*0.9993786082575034,0.096*0.9993786082575034,'0xf30458f8467c524ce6712f6209ec7e6a1639cad9820183bfb434dd4747283252',1781476543),
('solana','4j2VyCdUQetzpDgAmJ8PBpbKuNFEhirj75nZF2d6Rd3LJ8wLZZtoNumGihNPCz3EM4v8aRtpvbuk2GGLZSCZ24BB','6owprDyc27ez8ntHnwYenFJuNgAqEttAwKfDuEdTfSFw','jupiter-solana',
'So11111111111111111111111111111111111111112','Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',50000000,3268563,
'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',172029,499,0.05*68.71830179312263,0.172029*0.9995204192118923,'426307675',1781396902))
INSERT INTO "Swap" (id,"chainKey","txHash","takerAddress","dexId","tokenIn","tokenOut","amountIn","amountOut","feeToken","protocolFee","feeBps","volumeUsd","feeUsd","volumePriced","feePriced",status,"settlementKey","verifiedAt","blockRef","createdAt")
SELECT 'reviewed:'||chain||':'||hash,chain,hash,wallet,venue,asset_in,asset_out,amt_in,amt_out,fee_token,fee,bps,volume_usd,fee_usd,true,true,'confirmed',chain||':'||hash,CURRENT_TIMESTAMP AT TIME ZONE 'UTC',block_ref,to_timestamp(epoch) AT TIME ZONE 'UTC'
FROM evidence e WHERE EXISTS(SELECT 1 FROM "Swap" s WHERE s."chainKey"=e.chain AND s."txHash"=e.hash AND s."verifiedAt" IS NULL)
ON CONFLICT ("settlementKey") DO NOTHING;
COMMIT;
