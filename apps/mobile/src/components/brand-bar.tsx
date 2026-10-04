/**
 * BrandBar — compact logo + wordmark for mobile screen headers.
 */
import { Image, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

const logo = require("../../assets/icon.png");

export function BrandBar({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.row}>
      <Image source={logo} style={[styles.logo, compact && styles.logoCompact]} accessibilityLabel="XAUConnect logo" />
      {!compact && (
        <Text style={styles.wordmark}>
          XAU<Text style={styles.gold}>Connect</Text>
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 36, height: 36, borderRadius: 8 },
  logoCompact: { width: 28, height: 28 },
  wordmark: { fontSize: 20, fontWeight: "800", color: colors.ink, letterSpacing: -0.3 },
  gold: { color: colors.goldDark },
});
