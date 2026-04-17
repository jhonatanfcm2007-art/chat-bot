/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#2563EB",
        "on-primary": "#FFFFFF",
        "secondary-bg": "#F1F5F9",
        "surface": "#FFFFFF",
        "on-surface": "#1E293B",
        "on-surface-variant": "#64748B",
        "outline-variant": "#E2E8F0",
        "background": "#F8FAFC",
        "tertiary": "#10B981",
        "error": "#EF4444"
      },
      borderRadius: {
        "DEFAULT": "0.125rem",
        "lg": "0.25rem",
        "xl": "0.5rem",
        "full": "0.75rem"
      },
      fontFamily: {
        "headline": ["Manrope", "sans-serif"],
        "body": ["Inter", "sans-serif"],
        "label": ["Inter", "sans-serif"]
      }
    },
  },
  plugins: [],
}
