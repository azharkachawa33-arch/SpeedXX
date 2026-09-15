/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '320px',
        'sm': '375px',
        'md': '390px',
        'lg': '414px',
        'xl': '768px',
        '2xl': '1024px',
        '3xl': '1366px',
        '4xl': '1920px',
      },
    },
  },
  plugins: [],
}