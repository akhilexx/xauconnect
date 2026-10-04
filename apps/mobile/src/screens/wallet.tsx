/**
 * WalletScreen — watch-only multi-chain portfolio (paste an address);
 * WalletConnect pairing ships with the session module.
 */
import { useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api, formatUsd, type WalletBalance, type WalletTx } from "../api";
import { colors, radii } from "../theme";
import { GlassCard, GoldButton, StatTile } from "../components/glass";
import { BrandBar } from "../components/brand-bar";

export function WalletScreen() {
  const [input, setInput] = useState("");
  const [address, setAddress] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["balances", address],
    enabled: Boolean(address),
    queryFn: () => api.walletBalances(address!),
  });
  const historyQuery = useQuery({
    queryKey: ["history", address],
    enabled: Boolean(address),
    queryFn: () => api.walletHistory(address!),
  });

  const balances: WalletBalance[] = query.data?.balances ?? [];
  const history: WalletTx[] = historyQuery.data?.history ?? [];
  const total = balances.reduce((sum: number, b: WalletBalance) => sum + b.usdValue, 0);

  return (
    <View style={styles.root}>
      <BrandBar />
      <Text style={[styles.title, { marginTop: 12 }]}>Wallet</Text>

      {!address ? (
        <GlassCard>
          <Text style={styles.label}>Watch an address</Text>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="0x…"
            placeholderTextColor={colors.inkFaint}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
          <View style={{ marginTop: 12 }}>
            <GoldButton
              title="Watch portfolio"
              disabled={!/^0x[a-fA-F0-9]{40}$/.test(input.trim())}
              onPress={() => setAddress(input.trim())}
            />
          </View>
          <Text style={styles.hint}>
            Balances are fetched live from chain RPCs via the XAUConnect backend. WalletConnect
            pairing for signing arrives with the embedded wallet module.
          </Text>
        </GlassCard>
      ) : (
        <>
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
            <StatTile label="Portfolio" value={formatUsd(total)} />
            <StatTile label="Assets" value={String(balances.length)} />
          </View>
          <FlatList
            data={balances}
            keyExtractor={(b) => `${b.chainKey}-${b.symbol}`}
            refreshing={query.isFetching}
            onRefresh={() => void query.refetch()}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.symbol}>{item.symbol}</Text>
                  <Text style={styles.chain}>{item.chainKey}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.balance}>{item.balanceFormatted}</Text>
                  <Text style={styles.usd}>{formatUsd(item.usdValue)}</Text>
                </View>
              </View>
            )}
            ListFooterComponent={
              history.length > 0 ? (
                <View>
                  <Text style={styles.sectionTitle}>Activity</Text>
                  {history.map((tx: WalletTx) => (
                    <View key={tx.id} style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.symbol}>
                          {tx.kind === "swap" ? "⇄" : tx.kind === "receive" ? "↓" : "↑"} {tx.kind}
                        </Text>
                        <Text style={styles.chain}>{tx.chainKey}</Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.balance}>
                          {tx.amount} {tx.symbol}
                        </Text>
                        <Text style={styles.usd}>{formatUsd(tx.usdValue)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null
            }
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.base, padding: 16 },
  title: { fontSize: 28, fontWeight: "800", color: colors.ink, marginBottom: 12 },
  label: {
    color: colors.inkMuted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 12,
    marginTop: 8,
    color: colors.ink,
    fontSize: 15,
  },
  hint: { color: colors.inkFaint, fontSize: 11, marginTop: 10, lineHeight: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 8,
  },
  symbol: { color: colors.ink, fontWeight: "800", fontSize: 15 },
  sectionTitle: {
    color: colors.ink,
    fontWeight: "800",
    fontSize: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  chain: { color: colors.inkMuted, fontSize: 12, marginTop: 2 },
  balance: { color: colors.ink, fontWeight: "700", fontVariant: ["tabular-nums"] },
  usd: { color: colors.inkMuted, fontSize: 12, marginTop: 2 },
});
