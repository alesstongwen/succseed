/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        leaf: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        soil: {
          50: '#fdf8f0',
          100: '#faecd8',
          200: '#f3d5a8',
          300: '#e8b876',
          400: '#d9934a',
          500: '#c4772e',
          600: '#a85f24',
          700: '#8a4920',
          800: '#703b1e',
          900: '#5c311c',
        },
      },
    },
  },
  plugins: [],
}

