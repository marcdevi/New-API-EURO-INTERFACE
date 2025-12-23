import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#E6F7FB',
          100: '#BCE1EC',
          200: '#8FCBDD',
          300: '#62B5CE',
          400: '#359FBF',
          500: '#1B7295',
          600: '#155A77',
          700: '#104259',
          800: '#0A2A3B',
          900: '#05121D',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};

export default config;
