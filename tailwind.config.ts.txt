import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        ink: "var(--text)",
        muted: "var(--muted)",
        line: "var(--border)",
        primary: "var(--primary)",
        "primary-strong": "var(--primary-strong)",
        "primary-soft": "var(--primary-soft)",
        accent: "var(--accent)",
        danger: "var(--danger)",
      },
      fontFamily: {
        sans: ["Cairo", "Segoe UI", "Tahoma", "sans-serif"],
        latin: ["Playfair Display", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;