/**
 * LaunchpadScreen — mobile token launcher:
 * compact form (type, chain, name/symbol/supply, description) → prepares the
 * launch via the backend (validates + pins metadata to IPFS) and shows the
 * contract call to execute. On-chain signing arrives with WalletConnect.
 * Below the form: live feed of recent XAU launches.
 */
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, type LaunchFeedItem, type TokenLaunchRequest } from "../api";
import { colors, radii } from "../theme";
import { Badge, GlassCard, GoldButton } from "../components/glass";
import { BrandBar } from "../components/brand-bar";

const CHAINS = ["ethereum", "bsc", "polygon", "arbitrum", "base", "avalanche"];

export function LaunchpadScreen() {
  const [launchType, setLaunchType] = useState<"standard" | "bonding-curve">("standard");
  const [chainKey, setChainKey] = useState("bsc");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [supply, setSupply] = useState("1000000000");
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<{ metadataURI: string; method: string } | null>(null);

  const launchesQuery = useQuery({
    queryKey: ["launches"],
    refetchInterval: 30_000,
    queryFn: () => api.launches(),
  });

  const valid =
    name.trim().length > 0 && /^[A-Z0-9]{1,12}$/.test(symbol) && /^\d+$/.test(supply);

  const prepare = useMutation({
    mutationFn: () => {
      const launch: TokenLaunchRequest = {
        chainKey,
        name: name.trim(),
        symbol,
        totalSupply: supply,
        description,
        launchType,
        feeCurrency: "native",
        creator: "0x0000000000000000000000000000000000000001",
      };
      return api.prepareLaunch(launch);
    },
    onSuccess: (data) =>
      setResult({ metadataURI: data.metadataURI, method: data.contractCall.method }),
    onError: (err) => Alert.alert("Prepare failed", (err as Error).message),
  });

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <BrandBar />
      <Text style={[styles.title, { marginTop: 12 }]}>Launchpad</Text>

      {result ? (
        <GlassCard>
          <Text style={styles.cardTitle}>🚀 Launch prepared</Text>
          <Text style={styles.body}>
            Metadata pinned. Contract call: {result.method}. Connect a wallet (WalletConnect,
            coming soon) or finish the deployment from the web app.
          </Text>
          <Text style={styles.mono} numberOfLines={2}>
            {result.metadataURI.slice(0, 90)}…
          </Text>
          <View style={{ marginTop: 12 }}>
            <GoldButton title="Prepare another" onPress={() => setResult(null)} />
          </View>
        </GlassCard>
      ) : (
        <GlassCard>
          {/* Type */}
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(["standard", "bonding-curve"] as const).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setLaunchType(t)}
                style={[styles.typePill, launchType === t && styles.typePillActive]}
              >
                <Text style={[styles.typeText, launchType === t && styles.typeTextActive]}>
                  {t === "standard" ? "Standard" : "Bonding curve"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Chain */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12, flexGrow: 0 }}>
            {CHAINS.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setChainKey(c)}
                style={[styles.chainPill, chainKey === c && styles.chainPillActive]}
              >
                <Text style={[styles.typeText, chainKey === c && styles.typeTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Token name"
            placeholderTextColor={colors.inkFaint}
            style={styles.input}
          />
          <TextInput
            value={symbol}
            onChangeText={(v) => setSymbol(v.toUpperCase().slice(0, 12))}
            placeholder="SYMBOL"
            autoCapitalize="characters"
            placeholderTextColor={colors.inkFaint}
            style={styles.input}
          />
          <TextInput
            value={supply}
            onChangeText={(v) => /^\d*$/.test(v) && setSupply(v)}
            placeholder="Total supply"
            keyboardType="number-pad"
            placeholderTextColor={colors.inkFaint}
            style={styles.input}
          />
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Description (optional)"
            placeholderTextColor={colors.inkFaint}
            multiline
            style={[styles.input, { height: 72, textAlignVertical: "top" }]}
          />

          <View style={{ marginTop: 14 }}>
            <GoldButton
              title={launchType === "bonding-curve" ? "Prepare fair launch" : "Prepare token"}
              disabled={!valid}
              loading={prepare.isPending}
              onPress={() => prepare.mutate()}
            />
          </View>
          <Text style={styles.hint}>
            Preparing validates your token and pins metadata to IPFS. The deploy transaction is
            signed by your wallet — fee: 0.01 native (XAU payments get 20% off).
          </Text>
        </GlassCard>
      )}

      {/* Recent launches */}
      <Text style={styles.sectionTitle}>Recent XAU launches</Text>
      {(launchesQuery.data?.launches ?? []).length === 0 ? (
        <GlassCard>
          <Text style={styles.body}>No launches yet — be the first.</Text>
        </GlassCard>
      ) : (
        (launchesQuery.data?.launches ?? []).map((l: LaunchFeedItem) => (
          <View key={l.id} style={styles.launchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.launchSymbol}>{l.token.symbol}</Text>
              <Text style={styles.body} numberOfLines={1}>
                {l.token.name} · {l.token.chainKey}
              </Text>
            </View>
            <Badge
              text={l.type === "BONDING_CURVE" ? "curve" : "standard"}
              tone={l.type === "BONDING_CURVE" ? "pink" : "gold"}
            />
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.base },
  title: { fontSize: 28, fontWeight: "800", color: colors.ink, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: colors.ink },
  body: { color: colors.inkSoft, fontSize: 13, marginTop: 4, lineHeight: 19 },
  mono: { color: colors.inkMuted, fontSize: 11, marginTop: 8, fontVariant: ["tabular-nums"] },
  typePill: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: 10,
    alignItems: "center",
  },
  typePillActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  typeText: { color: colors.inkMuted, fontWeight: "700", fontSize: 13 },
  typeTextActive: { color: colors.ink },
  chainPill: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
  },
  chainPillActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  input: {
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 12,
    marginTop: 10,
    color: colors.ink,
    fontSize: 15,
  },
  hint: { color: colors.inkFaint, fontSize: 11, marginTop: 10, lineHeight: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.ink,
    marginTop: 20,
    marginBottom: 8,
  },
  launchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 8,
  },
  launchSymbol: { color: colors.ink, fontWeight: "800", fontSize: 15 },
});
