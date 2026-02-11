/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Lora', 'Georgia', 'serif'],
      },
      colors: {
        cream: {
          50: '#FEFDFB',
          100: '#FAF9F6',
          200: '#F5F3EE',
          300: '#EBE7DF',
          400: '#DED8CC',
        },
        warm: {
          brown: '#8B7355',
          brownDark: '#6B5544',
          terracotta: '#C4754B',
          terracottaDark: '#A65F3A',
        }
      },
    },
  },
  plugins: [],
}
