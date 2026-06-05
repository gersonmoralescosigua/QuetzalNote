/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Open Sans', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        primary:           '#18639c',
        'primary-hover':   '#044F88',
        secondary:         '#02dac5',
        'blue-light':      '#EBF5FE',
        'gray-border':     '#eceef0',
      },
    },
  },
  plugins: [],
};
