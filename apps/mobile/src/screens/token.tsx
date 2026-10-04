/**
 * TokenScreen — token detail: price header, stats grid, native candle chart
 * with interval switcher, audit/launch badges.
 */
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { api, formatPercent, formatUsd } from "../api";
import { colors, radii } from "../theme";
import { Badge, GlassCard, StatTile } from "../components/glass";
import { CandleChart } from "../components/candle-chart";
import type { DiscoverStackParams } from "../navigation";

const INTERVALS = ["15m", "1h", "4h", "1d"] as const;

export function TokenScreen() {
  const route = useRoute<RouteProp<DiscoverStackParams, "Token">>();
  const { chainKey, address } = route.params;
  const [interval, setInterval] = useState<(typeof INTERVALS)[number]>("1h");

  const query = useQuery({
    queryKey: ["token", chainKey, address],
    refetchInterval: 30_000,
    queryFn: () => api.tokenDetail(chainKey, address),
  });
  const candlesQuery = useQuery({
    queryKey: ["candles", chainKey, address, interval],
    refetchInterval: 60_000,
    queryFn: () => api.candles(chainKey, address, interval),
  });

  const token = query.data?.token;

  if (!token) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: colors.inkMuted }}>
          {query.isLoading ? "Loading…" : "Token not found."}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <GlassCard>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={styles.symbol}>{token.symbol}</Text>
          {token.xauLaunch && <Badge text="XAU launch" tone="gold" />}
        </View>
        <Text style={styles.name}>{token.name} · {token.chainKey}</Text>
        <Text style={styles.price}>{formatUsd(token.priceUsd)}</Text>
        <Text
          style={[
            styles.change,
            { color: token.change24hPct >= 0 ? colors.success : colors.danger },
          ]}
        >
          {formatPercent(token.change24hPct)} · 24h
        </Text>
      </GlassCard>

      <View style={styles.grid}>
        <StatTile label="Market cap" value={token.marketCapUsd ? formatUsd(token.marketCapUsd) : "—"} />
        <StatTile label="Liquidity" value={formatUsd(token.liquidityUsd)} />
      </View>
      <View style={styles.grid}>
        <StatTile label="Volume 24h" value={formatUsd(token.volume24hUsd)} />
        <StatTile label="Holders" value={token.holders ? token.holders.toLocaleString() : "—"} />
      </View>

      {/* Chart */}
      <View style={styles.chartHeader}>
        <Text style={styles.sectionTitle}>Price chart</Text>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {INTERVALS.map((iv) => (
            <TouchableOpacity
              key={iv}
              onPress={() => setInterval(iv)}
              style={[styles.ivPill, interval === iv && styles.ivPillActive]}
            >
              <Text style={[styles.ivText, interval === iv && styles.ivTextActive]}>{iv}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <CandleChart candles={candlesQuery.data?.candles ?? []} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.base },
  symbol: { fontSize: 24, fontWeight: "800", color: colors.ink },
  name: { color: colors.inkMuted, marginTop: 2, fontSize: 13 },
  price: { fontSize: 32, fontWeight: "800", color: colors.ink, marginTop: 12 },
  change: { fontWeight: "700", marginTop: 4 },
  grid: { flexDirection: "row", gap: 12, marginTop: 12 },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: { fontWeight: "800", color: colors.ink, fontSize: 15 },
  ivPill: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  ivPillActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  ivText: { color: colors.inkMuted, fontWeight: "600", fontSize: 11 },
  ivTextActive: { color: colors.ink },
});
