/**
 * SwapScreen — chain pills, token pair, amount input, XAU routed quotes with
 * best-route highlight. Execution hands off to the connected wallet via
 * WalletConnect v2 mobile linking (placeholder until the session module ships).
 */
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api, type RouteQuote, type TokenInfo } from "../api";
import { brandedRouteName } from "../branding";
import { colors, radii } from "../theme";
import { Badge, GlassCard, GoldButton } from "../components/glass";
import { BrandBar } from "../components/brand-bar";

const CHAIN_PILLS = [
  { key: "ethereum", name: "Ethereum" },
  { key: "bsc", name: "BNB" },
  { key: "polygon", name: "Polygon" },
  { key: "arbitrum", name: "Arbitrum" },
  { key: "base", name: "Base" },
  { key: "solana", name: "Solana" },
];

function toBaseUnits(amount: string, decimals: number): string | null {
  if (!/^\d*\.?\d*$/.test(amount) || amount === "" || amount === ".") return null;
  const [whole = "0", frac = ""] = amount.split(".");
  const base = whole + frac.slice(0, decimals).padEnd(decimals, "0");
  const trimmed = base.replace(/^0+(?=\d)/, "");
  return trimmed === "" || /^0+$/.test(trimmed) ? null : trimmed;
}

function fromBaseUnits(value: string, decimals: number): string {
  const s = value.padStart(decimals + 1, "0");
  const whole = s.slice(0, s.length - decimals) || "0";
  const frac = s.slice(s.length - decimals).slice(0, 6).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}

export function SwapScreen() {
  const [chainKey, setChainKey] = useState("bsc");
  const [amount, setAmount] = useState("");
  const [tokenIn, setTokenIn] = useState<TokenInfo | null>(null);
  const [tokenOut, setTokenOut] = useState<TokenInfo | null>(null);

  const tokensQuery = useQuery({
    queryKey: ["tokens", chainKey],
    queryFn: () => api.tokens(chainKey),
  });

  useEffect(() => {
    const tokens = tokensQuery.data?.tokens ?? [];
    setTokenIn(tokens[0] ?? null);
    setTokenOut(tokens[2] ?? tokens[1] ?? null);
  }, [tokensQuery.data]);

  const amountIn = useMemo(
    () => (tokenIn ? toBaseUnits(amount, tokenIn.decimals) : null),
    [amount, tokenIn],
  );

  const quoteQuery = useQuery({
    queryKey: ["quote", chainKey, tokenIn?.address, tokenOut?.address, amountIn],
    enabled: Boolean(tokenIn && tokenOut && amountIn),
    refetchInterval: 15_000,
    queryFn: () =>
      api.quote({
        chainKey,
        tokenIn: tokenIn!.address,
        tokenOut: tokenOut!.address,
        amountIn: amountIn!,
      }),
  });

  const quote = quoteQuery.data;
  const best = quote?.best ?? null;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <BrandBar />
      <Text style={[styles.title, { marginTop: 12 }]}>Swap</Text>

      {/* Chain pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
        {CHAIN_PILLS.map((chain) => (
          <TouchableOpacity
            key={chain.key}
            onPress={() => {
              setChainKey(chain.key);
              setAmount("");
            }}
            style={[styles.pill, chainKey === chain.key && styles.pillActive]}
          >
            <Text style={[styles.pillText, chainKey === chain.key && styles.pillTextActive]}>
              {chain.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Pay / receive */}
      <GlassCard style={{ marginTop: 14 }}>
        <Text style={styles.label}>You pay {tokenIn ? `· ${tokenIn.symbol}` : ""}</Text>
        <TextInput
          value={amount}
          onChangeText={(v) => /^\d*\.?\d*$/.test(v) && setAmount(v)}
          placeholder="0.0"
          placeholderTextColor={colors.inkFaint}
          keyboardType="decimal-pad"
          style={styles.amount}
        />
        <View style={styles.divider} />
        <Text style={styles.label}>You receive {tokenOut ? `· ${tokenOut.symbol}` : ""}</Text>
        <Text style={[styles.amount, { color: best ? colors.ink : colors.inkFaint }]}>
          {best && tokenOut ? fromBaseUnits(best.amountOutAfterFee, tokenOut.decimals) : "0.0"}
        </Text>
        {best && (
          <Text style={styles.meta}>
            via {brandedRouteName(best.dexId)} · impact {(best.priceImpactBps / 100).toFixed(2)}%
          </Text>
        )}
        <View style={{ marginTop: 14 }}>
          <GoldButton
            title={amountIn ? "Swap" : "Enter an amount"}
            disabled={!best}
            loading={quoteQuery.isFetching && !quote}
            onPress={() =>
              Alert.alert(
                "Connect wallet",
                "Swap execution uses WalletConnect v2 mobile linking — pair a wallet in Settings to sign this transaction.",
              )
            }
          />
        </View>
      </GlassCard>

      {/* Route list */}
      {quote && quote.quotes.length > 0 && (
        <GlassCard style={{ marginTop: 14 }}>
          <Text style={styles.sectionTitle}>Routes</Text>
          {quote.quotes.map((route: RouteQuote) => (
            <View key={route.dexId} style={styles.routeRow}>
              <Text style={styles.routeName}>
                {route.dexId === best?.dexId ? "👑 " : ""}
                {brandedRouteName(route.dexId)}
              </Text>
              {route.simulated && <Badge text="preview" tone="neutral" />}
              <Text style={styles.routeOut}>
                {tokenOut ? fromBaseUnits(route.amountOutAfterFee, tokenOut.decimals) : "—"}
              </Text>
            </View>
          ))}
        </GlassCard>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.base },
  content: { padding: 16, paddingBottom: 48 },
  title: { fontSize: 28, fontWeight: "800", color: colors.ink, marginBottom: 12 },
  pill: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  pillActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  pillText: { color: colors.inkMuted, fontWeight: "600", fontSize: 13 },
  pillTextActive: { color: colors.ink },
  label: {
    color: colors.inkMuted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  amount: { fontSize: 30, fontWeight: "800", color: colors.ink, marginTop: 4 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  meta: { color: colors.inkMuted, fontSize: 12, marginTop: 6 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: colors.ink, marginBottom: 8 },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  routeName: { flex: 1, color: colors.inkSoft, fontWeight: "600", fontSize: 14 },
  routeOut: { color: colors.ink, fontWeight: "700", fontVariant: ["tabular-nums"] },
});
