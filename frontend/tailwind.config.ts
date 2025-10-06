import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary, #2563eb)',
        secondary: 'var(--color-secondary, #64748b)',
      },
      fontFamily: {
        sans: ['var(--font-family, system-ui)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
