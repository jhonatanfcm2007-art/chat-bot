/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#fbbf24", /* Amber 400 */
        "on-primary": "#0f172a",
        "secondary-bg": "#1e293b", /* Slate 800 */
        "surface": "#0f172a", /* Deep Slate */
        "on-surface": "#f8fafc", /* Slate 50 */
        "on-surface-variant": "#94a3b8", /* Slate 400 */
        "outline-variant": "#334155", /* Slate 700 */
        "background": "#020617", /* Deepest Blue/Black */
        "tertiary": "#2dd4bf", /* Teal 400 */
        "error": "#f43f5e", /* Rose 500 */
        "panel-bg": "#0b0e14",
        "chat-bubble-user": "#1e293b",
        "chat-bubble-agent-start": "#6366f1",
        "chat-bubble-agent-end": "#a855f7"
      },
      borderRadius: {
        "3xl": "1.5rem",
        "4xl": "2rem",
        "5xl": "2.5rem"
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
