/** @type {import('tailwindcss').Config} */
import animatedPlugin from 'tailwindcss-animated'
import aspectRatioPlugin from '@tailwindcss/aspect-ratio'

module.exports = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#875DFF'
        },
        success: {
          DEFAULT: '#5DDD22'
        },
        error: {
          DEFAULT: '#D92B2B'
        }
      }
    }
  },
  plugins: [animatedPlugin, aspectRatioPlugin]
}
