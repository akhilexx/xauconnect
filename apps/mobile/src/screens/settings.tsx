/**
 * SettingsScreen — app preferences + WalletConnect pairing placeholder.
 */
import { Alert, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import { colors } from "../theme";
import { GlassCard, GoldButton, Badge } from "../components/glass";
import { BrandBar } from "../components/brand-bar";

const logo = require("../../assets/icon.png");

export function SettingsScreen() {
  const apiUrl = (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? "—";

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <BrandBar />
      <Text style={[styles.title, { marginTop: 16 }]}>Settings</Text>

      <GlassCard>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={styles.cardTitle}>WalletConnect</Text>
          <Badge text="coming soon" tone="neutral" />
        </View>
        <Text style={styles.body}>
          Pair MetaMask, Rainbow, Trust or any WalletConnect v2 wallet to sign swaps and launches
          from your phone.
        </Text>
        <View style={{ marginTop: 12 }}>
          <GoldButton
            title="Pair a wallet"
            onPress={() =>
              Alert.alert("Coming soon", "WalletConnect v2 pairing ships with the next release.")
            }
          />
        </View>
      </GlassCard>

      <GlassCard style={{ marginTop: 12 }}>
        <Text style={styles.cardTitle}>Backend</Text>
        <Text style={styles.body}>API endpoint: {apiUrl}</Text>
        <Text style={styles.hint}>
          Change `expo.extra.apiUrl` in app.json to point at your deployed backend.
        </Text>
      </GlassCard>

      <GlassCard style={{ marginTop: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <Image source={logo} style={{ width: 48, height: 48, borderRadius: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>About XAUConnect</Text>
            <Text style={styles.hint}>v0.1.0</Text>
          </View>
        </View>
        <Text style={styles.body}>
          The gold-standard multi-chain DEX & token launch platform. Built with Expo; shares the
          backend API with the web app.
        </Text>
      </GlassCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.base },
  title: { fontSize: 28, fontWeight: "800", color: colors.ink, marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: "800", color: colors.ink },
  body: { color: colors.inkSoft, fontSize: 13, marginTop: 6, lineHeight: 19 },
  hint: { color: colors.inkFaint, fontSize: 11, marginTop: 6 },
});
