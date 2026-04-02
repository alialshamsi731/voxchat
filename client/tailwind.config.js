/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // VoxLink dark theme palette
        bg: {
          900: '#0f1117',  // deepest background
          800: '#161b27',  // sidebar bg
          700: '#1e2435',  // secondary panels
          600: '#252d42',  // hover states
          500: '#2e3750',  // borders/dividers
        },
        brand: {
          DEFAULT: '#7c6af7',  // primary purple
          light: '#9d8fff',
          dark: '#5f4fd4',
        },
        accent: {
          green: '#3ecf8e',
          red: '#f04f4f',
          yellow: '#f5a623',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
