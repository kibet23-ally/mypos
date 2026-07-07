/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0F172A',
        foreground: '#FFFFFF',
        'foreground-light': '#0F172A',
        card: '#111827',
        border: '#334155',
        primary: '#655EF3',
        'primary-hover': '#5448F0',
        muted: '#94A3B8',
      },
    },
  },
  plugins: [],
}