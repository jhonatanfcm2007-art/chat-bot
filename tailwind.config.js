/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#004d4d", /* Dark Teal from image */
        "on-primary": "#ffffff",
        "secondary-bg": "#f0f2f5", /* Light Gray */
        "surface": "#ffffff", /* White */
        "on-surface": "#1a1a1a", /* Dark text */
        "on-surface-variant": "#64748b", /* Slate 500 */
        "outline-variant": "#e2e8f0", /* Slate 200 */
        "background": "#f8fafc", /* Very light blue-gray */
        "tertiary": "#22c55e", /* Success Green */
        "error": "#ef4444", /* Red */
        "panel-bg": "#ffffff",
        "chat-bubble-incoming": "#ffffff",
        "chat-bubble-outgoing": "#dcf8c6", /* WhatsApp light green */
        "accent": "#00a884" /* WhatsApp green accent */
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
