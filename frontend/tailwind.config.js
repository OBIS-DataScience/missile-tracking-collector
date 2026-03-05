/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Command center dark theme
        navy: {
          900: '#0B0F1A',
          800: '#111827',
          700: '#1A2332',
          600: '#243044',
        },
        // Confidence level colors (dark mode)
        strike: {
          confirmed: '#EF4444',
          likely: '#F97316',
          unverified: '#6B7280',
          intercepted: '#22C55E',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
