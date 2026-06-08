/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3b82f6',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#64748b',
          foreground: '#0f172a',
        },
        accent: {
          DEFAULT: '#f97316',
          foreground: '#0f172a',
        },
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        background: '#f8fafc',
        foreground: '#0f172a',
        card: {
          DEFAULT: '#ffffff',
          foreground: '#0f172a',
        },
        popover: {
          DEFAULT: '#f8fafc',
          foreground: '#0f172a',
        },
        muted: {
          DEFAULT: '#f1f5f9',
          foreground: '#64748b',
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#ffffff',
        },
        border: '#e2e8f0',
        input: '#f1f5f9',
        ring: '#cbd5e1',
        surface: {
          DEFAULT: '#ffffff',
          hover: '#f1f5f9',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'typing': 'typing 2s steps(40, end)',
        'blink-caret': 'blink-caret .75s step-end infinite',
      },
      keyframes: {
        typing: {
          'from': { width: '0' },
          'to': { width: '100%' },
        },
        'blink-caret': {
          'from, to': { borderColor: 'transparent' },
          '50%': { borderColor: '#3b82f6' },
        },
      },
    },
  },
  plugins: [],
}