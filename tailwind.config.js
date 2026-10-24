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
        // "MONOLITH seam" theme (inspired by brandmotion.in's free MONOLITH design):
        // true-black ink surfaces + one luminous seam accent.
        // Overrides the default slate scale so every existing slate-* class restyles.
        slate: {
          50: '#f7f7fa',
          100: '#efeFF4',
          200: '#dcdce4',
          300: '#b9b9c6',
          400: '#8f8f9e',
          500: '#63636f',
          600: '#43434e',
          700: '#2a2a33',
          800: '#17171e',
          900: '#0e0e13',
          950: '#060608',
        },
        // Luminous "seam of light" mint, replaces the stock emerald scale.
        emerald: {
          50: '#eafff8',
          100: '#c9ffee',
          200: '#93ffe0',
          300: '#54fccb',
          400: '#22f2b4',
          500: '#00d99a',
          600: '#00b47f',
          700: '#009067',
          800: '#067a56',
          900: '#075f46',
          950: '#022c21',
        },
        whatsapp: '#25D366',
        whatsappDark: '#128C7E',
      },
      fontFamily: {
        sans: ['"Space Grotesk"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Arial', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
