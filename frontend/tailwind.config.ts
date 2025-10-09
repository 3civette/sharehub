import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 3Civette Brand Colors
        brand: {
          black: '#0B0B0C',
          ink: '#111827',
          gold: '#D4AF37',
          silver: '#E5E7EB',
        },
        // Tenant override colors (via CSS custom properties)
        primary: 'var(--color-primary, #D4AF37)',
        secondary: 'var(--color-secondary, #0B0B0C)',
        // Backgrounds
        bg: '#FFFFFF',
        bgSoft: '#F8FAFC',
        // Status colors
        ok: '#16a34a',
        warn: '#f59e0b',
        error: '#dc2626',
      },
      fontFamily: {
        display: ['Archivo Black', 'Bebas Neue', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '6': '24px',
        '8': '32px',
        '12': '48px',
        '16': '64px',
      },
      borderRadius: {
        DEFAULT: '16px',
        lg: '20px',
      },
      boxShadow: {
        brand: '0 8px 24px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
}
export default config
