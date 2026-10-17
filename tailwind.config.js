/** @type {import("tailwindcss").Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "'SF Pro Text'",
          "Inter",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        naval: {
          50: "#e8edf5",
          100: "#c5d0e3",
          500: "#1a4a8a",
          700: "#0A2540",
          800: "#071c31",
          900: "#050f1e",
        },
        apple: {
          blue: "#007AFF",
          green: "#34C759",
          red: "#FF3B30",
          orange: "#FF9500",
          yellow: "#FFCC00",
          gray: {
            1: "#8E8E93",
            2: "#AEAEB2",
            3: "#C7C7CC",
            4: "#D1D1D6",
            5: "#E5E5EA",
            6: "#F2F2F7",
          },
        },
      },
      borderRadius: {
        "apple-sm": "10px",
        "apple-md": "14px",
        "apple-lg": "18px",
        "apple-xl": "22px",
        "apple-sheet": "28px",
      },
      boxShadow: {
        "apple-card": "0 2px 8px -2px rgba(0, 0, 0, 0.05), 0 1px 3px -1px rgba(0, 0, 0, 0.03)",
        "apple-sheet": "0 -10px 40px -10px rgba(0, 0, 0, 0.18)",
        "apple-popover": "0 14px 40px -8px rgba(0, 0, 0, 0.22)",
      },
    },
  },
  plugins: [],
};
