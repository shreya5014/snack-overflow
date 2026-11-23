/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#fdfbf7',
          100: '#faf6ef',
          200: '#f4ede1',
          300: '#ebe1d0',
        },
        brand: {
          50: '#fff8ed',
          100: '#ffefd5',
          200: '#fed9aa',
          300: '#fdbd74',
          400: '#fb963c',
          500: '#f97316', // Vibrant warm orange
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
      },
      boxShadow: {
        'soft-sm': '0 1px 2px 0 rgba(28, 25, 23, 0.04)',
        'soft': '0 2px 8px -2px rgba(28, 25, 23, 0.05), 0 1px 3px 0 rgba(28, 25, 23, 0.03)',
        'soft-md': '0 6px 16px -4px rgba(28, 25, 23, 0.07), 0 2px 4px -2px rgba(28, 25, 23, 0.03)',
        'soft-lg': '0 12px 28px -6px rgba(28, 25, 23, 0.09), 0 4px 10px -3px rgba(28, 25, 23, 0.04)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
