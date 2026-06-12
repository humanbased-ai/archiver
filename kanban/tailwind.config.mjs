/** @type {import('tailwindcss').Config} */

import fontInterPlugin from 'tailwindcss-font-inter'

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      screens: {
        'landscape': {'raw': '(orientation: landscape)'},
      },
    },
  },
  plugins: [
    fontInterPlugin({
      importFontFace: true,
      disableUnusedFeatures: true,
    }),
  ],
}
