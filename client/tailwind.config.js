/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        olive: '#4a5240',
        oldd: '#2d3228',
        ollg: '#6b7560',
        kh: '#c4b98a',
        khl: '#e8dfc0',
        am: '#d4830a',
        amb: '#f5a623',
        bg: '#141610',
        sf: '#1e201a',
        sf2: '#272a21',
        sf3: '#31352a',
        br: '#3f4335',
        brl: '#555b47',
        tx: '#e8dfc0',
        txd: '#9a9a80',
        txm: '#6b6b58',
      },
      fontFamily: {
        hd: ['"Bebas Neue"', 'sans-serif'],
        bd: ['"Rajdhani"', 'sans-serif'],
        mn: ['"Share Tech Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
