import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        clinical: {
          ink: "#1f2937",
          muted: "#64748b",
          line: "#d9e2ec",
          wash: "#f7fafc",
          blue: "#2563eb",
        },
      },
      boxShadow: {
        panel: "0 1px 2px rgba(15, 23, 42, 0.05)",
      },
    },
  },
  plugins: [],
} satisfies Config;
