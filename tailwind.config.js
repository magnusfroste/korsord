/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './App.tsx', './index.tsx', './components/**/*.{ts,tsx}', './services/**/*.ts', './lib/**/*.ts'],
  theme: {
    extend: {
      colors: {
        brand: { light: '#a5f3fc', DEFAULT: '#0891b2', dark: '#164e63' },
        accent: { yellow: '#fcd34d', orange: '#f97316', pink: '#f472b6', green: '#4ade80' },
      },
      animation: {
        'bounce-slow': 'bounce 3s infinite',
        'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
