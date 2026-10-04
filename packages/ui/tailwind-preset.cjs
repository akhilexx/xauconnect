/**
 * XAUConnect — Liquid Glass design system Tailwind preset.
 *
 * Palette
 *   canvas   #F8F9FA  white canvas (never name this "base" — collides with text-base font-size)
 *   gold     #FFD700 -> #FFAA00  primary accent
 *   pink     #FF69B4 -> #FFB6C1  secondary gradient accent
 *
 * Consumed by apps/web/tailwind.config.ts via `presets: [...]` and mirrored
 * in apps/mobile/src/theme.ts for React Native.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: "#F8F9FA",
          50: "#FFFFFF",
          100: "#F8F9FA",
          200: "#EEF0F3",
          300: "#E2E5EA",
        },
        gold: {
          DEFAULT: "#FFD700",
          light: "#FFE55C",
          deep: "#FFAA00",
          dark: "#B8860B",
        },
        blush: {
          DEFAULT: "#FF69B4",
          light: "#FFB6C1",
        },
        ink: {
          DEFAULT: "#15171C",
          soft: "#3D4350",
          muted: "#6B7280",
          faint: "#9CA3AF",
        },
        success: "#10B981",
        danger: "#EF4444",
        warning: "#F59E0B",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Satoshi", "Inter", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      backgroundImage: {
        "gold-gradient": "linear-gradient(135deg, #FFD700 0%, #FFAA00 100%)",
        "pink-gradient": "linear-gradient(135deg, #FF69B4 0%, #FFB6C1 100%)",
        "gold-pink": "linear-gradient(120deg, #FFD700 0%, #FFAA00 45%, #FF69B4 100%)",
        "glass-sheen":
          "linear-gradient(120deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.55) 100%)",
        "hero-radial":
          "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(255,215,0,0.18), transparent), radial-gradient(ellipse 60% 50% at 85% 20%, rgba(255,105,180,0.12), transparent)",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(21,23,28,0.08), inset 0 1px 0 rgba(255,255,255,0.6)",
        "glass-lg": "0 16px 48px rgba(21,23,28,0.12), inset 0 1px 0 rgba(255,255,255,0.7)",
        "gold-glow": "0 0 24px rgba(255,215,0,0.35), 0 4px 16px rgba(255,170,0,0.25)",
        "pink-glow": "0 0 24px rgba(255,105,180,0.25)",
        "inner-glow": "inset 0 0 20px rgba(255,255,255,0.5)",
      },
      backdropBlur: {
        glass: "24px",
      },
      borderRadius: {
        glass: "1.25rem",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-gold": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(255,215,0,0.4)" },
          "50%": { boxShadow: "0 0 0 12px rgba(255,215,0,0)" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        ticker: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
        "pulse-gold": "pulse-gold 2s ease-in-out infinite",
        "spin-slow": "spin-slow 14s linear infinite",
        ticker: "ticker 45s linear infinite",
      },
    },
  },
  plugins: [],
};
