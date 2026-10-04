/**
 * CandleChart — dependency-free native candlestick chart.
 * Each candle is two stacked Views (wick + body) positioned on a normalized
 * price scale; a volume strip renders underneath. Good for ~60 candles.
 */
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Candle } from "../api";
import { colors, radii } from "../theme";

const CHART_HEIGHT = 220;
const VOLUME_HEIGHT = 36;

export function CandleChart({ candles }: { candles: Candle[] }) {
  const data = useMemo(() => candles.slice(-60), [candles]);

  const { min, max, maxVol } = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    let vol = 0;
    for (const c of data) {
      if (c.low < lo) lo = c.low;
      if (c.high > hi) hi = c.high;
      if ((c.volume ?? 0) > vol) vol = c.volume ?? 0;
    }
    if (!Number.isFinite(lo) || hi === lo) {
      lo = 0;
      hi = 1;
    }
    return { min: lo, max: hi, maxVol: vol || 1 };
  }, [data]);

  if (data.length === 0) {
    return (
      <View style={[styles.frame, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: colors.inkMuted, fontSize: 12 }}>No chart data.</Text>
      </View>
    );
  }

  const range = max - min;
  const y = (price: number) => ((max - price) / range) * CHART_HEIGHT;

  return (
    <View style={styles.frame}>
      {/* Price scale labels */}
      <View style={styles.scale}>
        <Text style={styles.scaleText}>{formatPrice(max)}</Text>
        <Text style={styles.scaleText}>{formatPrice((max + min) / 2)}</Text>
        <Text style={styles.scaleText}>{formatPrice(min)}</Text>
      </View>

      <View style={{ flex: 1 }}>
        {/* Candles */}
        <View style={[styles.candleRow, { height: CHART_HEIGHT }]}>
          {data.map((c) => {
            const up = c.close >= c.open;
            const color = up ? colors.success : colors.danger;
            const bodyTop = y(Math.max(c.open, c.close));
            const bodyHeight = Math.max(2, Math.abs(y(c.open) - y(c.close)));
            const wickTop = y(c.high);
            const wickHeight = Math.max(1, y(c.low) - y(c.high));
            return (
              <View key={c.time} style={styles.candleSlot}>
                <View
                  style={{
                    position: "absolute",
                    top: wickTop,
                    height: wickHeight,
                    width: 1.2,
                    alignSelf: "center",
                    backgroundColor: color,
                    opacity: 0.7,
                  }}
                />
                <View
                  style={{
                    position: "absolute",
                    top: bodyTop,
                    height: bodyHeight,
                    left: 0.5,
                    right: 0.5,
                    borderRadius: 1.5,
                    backgroundColor: color,
                  }}
                />
              </View>
            );
          })}
        </View>

        {/* Volume strip */}
        <View style={[styles.candleRow, { height: VOLUME_HEIGHT, marginTop: 6 }]}>
          {data.map((c) => {
            const up = c.close >= c.open;
            const h = Math.max(1, ((c.volume ?? 0) / maxVol) * VOLUME_HEIGHT);
            return (
              <View key={c.time} style={styles.candleSlot}>
                <View
                  style={{
                    position: "absolute",
                    bottom: 0,
                    height: h,
                    left: 0.5,
                    right: 0.5,
                    borderRadius: 1,
                    backgroundColor: up ? "rgba(22,163,74,0.35)" : "rgba(239,68,68,0.35)",
                  }}
                />
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function formatPrice(value: number): string {
  if (value >= 1000) return value.toFixed(0);
  if (value >= 1) return value.toFixed(2);
  if (value >= 0.01) return value.toFixed(4);
  return value.toPrecision(3);
}

const styles = StyleSheet.create({
  frame: {
    flexDirection: "row",
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 10,
    minHeight: CHART_HEIGHT + VOLUME_HEIGHT + 26,
  },
  scale: {
    justifyContent: "space-between",
    height: CHART_HEIGHT,
    marginRight: 8,
  },
  scaleText: { color: colors.inkFaint, fontSize: 9, fontVariant: ["tabular-nums"] },
  candleRow: { flexDirection: "row", alignItems: "stretch" },
  candleSlot: { flex: 1, position: "relative" },
});
