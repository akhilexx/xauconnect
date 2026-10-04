/**
 * XAUConnect mobile theme — mirrors the Liquid Glass design tokens from
 * packages/ui/tailwind-preset.cjs (kept in sync manually because the Expo
 * app lives outside the pnpm workspace).
 */
export const colors = {
  base: "#F8F9FA",
  surface: "rgba(255, 255, 255, 0.72)",
  surfaceStrong: "rgba(255, 255, 255, 0.88)",
  border: "rgba(255, 255, 255, 0.65)",
  ink: "#0F172A",
  inkSoft: "#334155",
  inkMuted: "#64748B",
  inkFaint: "#94A3B8",
  gold: "#FFD700",
  goldDark: "#B8860B",
  goldDeep: "#FFAA00",
  pink: "#FF69B4",
  pinkSoft: "#FFB6C1",
  success: "#16A34A",
  danger: "#EF4444",
} as const;

export const radii = { sm: 12, md: 16, lg: 22, full: 999 } as const;

export const shadow = {
  glass: {
    shadowColor: "#B8860B",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
} as const;

export const goldGradient = ["#FFD700", "#FFAA00"] as const;
export const pinkGradient = ["#FF69B4", "#FFB6C1"] as const;
