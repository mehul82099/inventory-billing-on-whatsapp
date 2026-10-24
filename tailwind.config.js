/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // "Paper POS" theme (inspired by KODO, brandmotion.in's free-prompt design):
        // paper-white surfaces, ink-black text, one red accent.
        // Inverted slate remap: dark surface classes become paper tones, light text
        // classes become ink - so every existing slate-* class restyles in place.
        slate: {
          50: '#161513',
          100: '#1c1a14',
          200: '#26231c',
          300: '#3f3a30',
          400: '#6b6350',
          500: '#8a8069',
          600: '#b9b09a',
          700: '#ddd6c2',
          800: '#ece7d8',
          900: '#faf8f1',
          950: '#f2efe7',
        },
        white: '#161513',
        paper: '#f2efe7',
        ink: '#161513',
        // Ink replaces stock emerald (primary actions, badges, prices).
        emerald: {
          50: '#f6f3ea',
          100: '#eee9da',
          200: '#ddd5bd',
          300: '#c9bfa0',
          400: '#161513',
          500: '#161513',
          600: '#141210',
          700: '#121010',
          800: '#ddd6c2',
          900: '#0c0b0a',
          950: '#eee9da',
        },
        green: {
          50: '#f6f3ea',
          100: '#eee9da',
          200: '#ddd5bd',
          300: '#c9bfa0',
          400: '#161513',
          500: '#161513',
          600: '#141210',
          700: '#121010',
          800: '#ddd6c2',
          900: '#0c0b0a',
          950: '#eee9da',
        },
        // One red accent (KODO red).
        red: {
          50: '#fbf0ee',
          100: '#f6e0dc',
          200: '#eec4be',
          300: '#e09e94',
          400: '#c1271b',
          500: '#a81f15',
          600: '#8d1a11',
          700: '#721509',
          800: '#e5b7b0',
          900: '#f6e0dc',
          950: '#f6e0dc',
        },
        // Warm amber tuned for paper backgrounds.
        amber: {
          50: '#fdf7e8',
          100: '#f9efd4',
          200: '#f3e3b3',
          300: '#8a5a00',
          400: '#b58a1e',
          500: '#d97706',
          600: '#b45309',
          700: '#92400e',
          800: '#e8d5a8',
          900: '#f7ecd2',
          950: '#f7ecd2',
        },
        whatsapp: '#25D366',
        whatsappDark: '#128C7E',
      },
      fontFamily: {
        sans: ['Archivo', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Arial', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
