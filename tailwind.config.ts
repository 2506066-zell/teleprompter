import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        instrument: {
          bg: "#0B0B0C",        // Neutral 900: Root background
          canvas: "#111111",    // Neutral 800: Reading canvas
          surface: "#1A1A1A",   // Neutral 700: Card / Dock surface
          elevated: "#232323",  // Neutral 600: Elevated controls & modals
          border: "#2A2A2A",    // Subtle neutral border
          borderLight: "#383838",
          accent: "#22C55E",    // Green 600: Primary action & highlight
          accentMuted: "rgba(34, 197, 94, 0.15)",
          textPrimary: "#F5F5F5",
          textSecondary: "#A3A3A3",
          textTertiary: "#6B7280",
          warning: "#F59E0B",
          error: "#EF4444",
          info: "#3B82F6",
        },
      },
      borderRadius: {
        'btn': '12px',
        'panel': '16px',
        'dock': '16px',
      },
      fontFamily: {
        sans: ["var(--font-inter)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
      },
      animation: {
        "pulse-subtle": "pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      }
    },
  },
  plugins: [],
};
export default config;
