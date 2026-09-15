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
          bg: "#0F1114",        // Background (Canvas)
          canvas: "#0F1114",    // Canvas
          surface: "#171A1F",   // Surface (Panel)
          elevated: "#1F242A",  // Elevated (Control)
          border: "#2A2E34",    // Border (Outline)
          borderLight: "#383E46",
          accent: "#22C55E",    // Accent (Highlight / Active)
          accentMuted: "rgba(34, 197, 94, 0.15)",
          textPrimary: "#F5F7FA", // Text Primary (Active)
          textSecondary: "#A1A7B3", // Text Secondary (Context)
          textTertiary: "#6B7280", // Text Tertiary (Muted)
          warning: "#F59E0B",   // Warning (Low Confidence)
          error: "#EF4444",     // Error (Tracking Issue)
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
