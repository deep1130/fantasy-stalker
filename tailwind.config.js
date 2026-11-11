/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        stalker: {
          dark: '#0a0d14',
          card: '#111726',
          border: '#1e293b',
          accent: '#10b981', // radar green
          danger: '#f43f5e',
          warning: '#f59e0b',
          cyan: '#06b6d4',
          purple: '#8b5cf6',
        }
      }
    },
  },
  plugins: [],
}
