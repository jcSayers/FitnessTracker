/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3b82f6',
          bg: '#121212',
          text: '#ffffff',
        },
        secondary: {
          DEFAULT: '#64748b',
          bg: '#1e1e1e',
          text: '#b3b3b3',
        },
        accent: {
          DEFAULT: '#2196f3',
          light: '#64b5f6',
          dark: '#1976d2',
        },
        card: {
          bg: '#2d2d2d',
        },
        border: '#404040',
        success: '#4caf50',
        warning: '#ff9800',
        error: '#f44336',
      },
      fontFamily: {
        sans: ['Roboto', 'Helvetica Neue', 'sans-serif'],
      },
      boxShadow: {
        'custom': '0 2px 8px rgba(0, 0, 0, 0.3)',
        'custom-lg': '0 4px 16px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
}

