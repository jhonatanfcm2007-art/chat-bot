/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#6C5CE7",
        "primary-hover": "#5A4BD1",
        "primary-light": "#EDE9FE",
        "on-primary": "#ffffff",
        "secondary-bg": "#F1F3F9",
        "surface": "#ffffff",
        "on-surface": "#1E293B",
        "on-surface-variant": "#94A3B8",
        "outline-variant": "#E2E8F0",
        "background": "#F8F9FC",
        "tertiary": "#10B981",
        "error": "#EF4444",
        "warning": "#F59E0B",
        "panel-bg": "#ffffff",
        "chat-bubble-incoming": "#ffffff",
        "chat-bubble-outgoing": "#DCF8E8",
        "accent": "#10B981",
        "sidebar": "#1E293B",
        "sidebar-hover": "#334155",
      },
      fontFamily: {
        "headline": ["Inter", "system-ui", "sans-serif"],
        "body": ["Inter", "system-ui", "sans-serif"],
      }
    },
  },
  plugins: [],
}
