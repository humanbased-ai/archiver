/** @type {import('postcss-load-config').Config} */

module.exports = {
  plugins: [require('autoprefixer')(), require('tailwindcss')(), require('postcss-viewport-height-correction')()],
}
