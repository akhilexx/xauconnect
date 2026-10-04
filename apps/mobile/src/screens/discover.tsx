/**
 * DiscoverScreen — Trending / New / Gainers / Volume feed; tapping a row
 * opens the Token detail screen.
 */
import { useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api, formatPercent, formatUsd, type MarketToken } from "../api";
import { colors, radii } from "../theme";
import { Badge } from "../components/glass";
import { BrandBar } from "../components/brand-bar";
import type { DiscoverStackParams } from "../navigation";

const TABS = [
  { id: "trending", label: "Trending" },
  { id: "new", label: "New" },
  { id: "gainers", label: "Gainers" },
  { id: "volume", label: "Volume" },
] as const;

export function DiscoverScreen() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("trending");
  const navigation = useNavigation<NativeStackNavigationProp<DiscoverStackParams>>();

  const query = useQuery({
    queryKey: ["discovery", tab],
    refetchInterval: 30_000,
    queryFn: () => api.discovery(tab),
  });

  return (
    <View style={styles.root}>
      <BrandBar />
      <Text style={[styles.title, { marginTop: 12 }]}>Discover</Text>
      <View style={styles.tabs}>
        {TABS.map(({ id, label }) => (
          <TouchableOpacity
            key={id}
            onPress={() => setTab(id)}
            style={[styles.tab, tab === id && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === id && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList<MarketToken>
        data={query.data?.tokens ?? []}
        keyExtractor={(t) => `${t.chainKey}-${t.address}`}
        refreshing={query.isFetching}
        onRefresh={() => void query.refetch()}
        contentContainerStyle={{ paddingBottom: 32 }}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() =>
              navigation.navigate("Token", { chainKey: item.chainKey, address: item.address })
            }
          >
            <Text style={styles.rank}>{index + 1}</Text>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={styles.symbol}>{item.symbol}</Text>
                {item.xauLaunch && <Badge text="XAU" tone="gold" />}
              </View>
              <Text style={styles.name} numberOfLines={1}>
                {item.name} · {item.chainKey}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.price}>{formatUsd(item.priceUsd)}</Text>
              <Text
                style={[
                  styles.change,
                  { color: item.change24hPct >= 0 ? colors.success : colors.danger },
                ]}
              >
                {formatPercent(item.change24hPct)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          query.isLoading ? null : <Text style={styles.empty}>No tokens found.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.base, padding: 16 },
  title: { fontSize: 28, fontWeight: "800", color: colors.ink, marginBottom: 12 },
  tabs: { flexDirection: "row", gap: 6, marginBottom: 12 },
  tab: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tabActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  tabText: { color: colors.inkMuted, fontWeight: "600", fontSize: 13 },
  tabTextActive: { color: colors.ink },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 8,
  },
  rank: { width: 22, color: colors.inkFaint, fontWeight: "700" },
  symbol: { color: colors.ink, fontWeight: "800", fontSize: 15 },
  name: { color: colors.inkMuted, fontSize: 12, marginTop: 2 },
  price: { color: colors.ink, fontWeight: "700", fontVariant: ["tabular-nums"] },
  change: { fontSize: 12, fontWeight: "700", marginTop: 2 },
  empty: { color: colors.inkMuted, textAlign: "center", marginTop: 48 },
});
