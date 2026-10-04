/**
 * Liquid Glass primitives for React Native — Card, Button, Badge, StatTile.
 */
import type { PropsWithChildren } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, goldGradient, radii, shadow } from "../theme";

export function GlassCard({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function GoldButton({
  title,
  onPress,
  disabled,
  loading,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.85}>
      <LinearGradient
        colors={[...goldGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.button, (disabled || loading) && { opacity: 0.55 }]}
      >
        {loading ? (
          <ActivityIndicator color={colors.ink} />
        ) : (
          <Text style={styles.buttonText}>{title}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

export function Badge({ text, tone = "gold" }: { text: string; tone?: "gold" | "pink" | "neutral" }) {
  const palette = {
    gold: { bg: "rgba(255,215,0,0.16)", fg: colors.goldDark },
    pink: { bg: "rgba(255,105,180,0.12)", fg: colors.pink },
    neutral: { bg: "rgba(15,23,42,0.06)", fg: colors.inkSoft },
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.badgeText, { color: palette.fg }]}>{text}</Text>
    </View>
  );
}

export function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <GlassCard style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: 16,
    ...shadow.glass,
  },
  button: {
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: colors.ink, fontWeight: "700", fontSize: 16 },
  badge: {
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  stat: { flex: 1, padding: 14 },
  statLabel: {
    color: colors.inkMuted,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  statValue: { color: colors.ink, fontSize: 20, fontWeight: "800", marginTop: 4 },
});
