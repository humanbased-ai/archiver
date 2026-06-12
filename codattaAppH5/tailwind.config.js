/** @type {import('tailwindcss').Config} */

import defaultTheme from 'tailwindcss/defaultTheme'
import animatedPlugin from 'tailwindcss-animated'
// 添加一组 prose 类，用于美化富文本内容，如博客文章或文档。可以将 prose 类应用到一个元素上，以自动为其中的内容应用合理的排版样式。
import typographyPlugin from '@tailwindcss/typography'
// 提供基本的表单样式重置，使表单元素在不同浏览器中具有一致且简洁的样式
import formPlugin from '@tailwindcss/forms'
// 添加用于控制元素宽高比的实用工具，使其更容易创建保持特定宽高比的响应式元素。可以使用 aspect-w-16 aspect-h-9 等类来设置元素的宽高比。
import aspectRatioPlugin from '@tailwindcss/aspect-ratio'
// 将 Inter 字体系列集成到 TailwindCSS 中，为你的项目提供使用此字体的实用工具.
// importFontFace: true: 确保包含 Inter 的 @font-face 规则，以便正确导入字体。
// disableUnusedFeatures: true: 禁用未使用的 OpenType 功能以优化性能。
import fontInterPlugin from 'tailwindcss-font-inter'
import plugin from 'tailwindcss/plugin'

module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}', // Adjust the paths to match your project structure
  ],
  theme: {
    extend: {
      boxShadow: {
        primary: '0px 4px 8px 0px #875DFF1A, 0px 14px 14px 0px #875DFF17',
      },
      backgroundImage: {
        'gradient-1': 'linear-gradient(86deg, #E023FF 1.73%, #D55FFF 13.63%, #5057FF 71.06%, #50B5FF 95.83%)',
        'gradient-2': 'linear-gradient(90deg, #340B5D 0%, #6D17C3 100%)',
      },
      colors: {
        primary: {
          DEFAULT: '#D355FF',
          200: '#875DFF3D',
        },
        error: {
          DEFAULT: '#D92B2B',
        },
        gray: {
          DEFAULT: '#1C1C26',
          100: '#ffffff',
          200: '#E7E7E7',
          300: '#D1D1D1',
          400: '#808080',
          500: '#676767',
          600: '#4D4D4D',
          700: '#343434',
          800: '#1A1A1A',
          900: '#010101',
        },
        purple: {
          2: '#491B77',
          4: '#251437',
          5: '#221433',
          6: '#010101',
          100: '#F6DDFF',
          200: '#EDBBFF',
          300: '#E499FF',
          400: '#DC77FF',
          500: '#D355FF',
          600: '#A944CC',
          700: '#7F3399',
          750: '#491B77',
          800: '#442266',
          900: '#251437',
          950: '#251437',
        },
      },
      fontFamily: {
        inter: ['Inter', ...defaultTheme.fontFamily.sans],
        mona: ['Mona\\ Sans', ...defaultTheme.fontFamily.sans],
        zen: ['Zen\\ Dots', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [
    animatedPlugin,
    typographyPlugin,
    formPlugin,
    aspectRatioPlugin,
    fontInterPlugin({
      importFontFace: true,
      disableUnusedFeatures: true,
    }),
    plugin(function ({ addComponents }) {
      addComponents({
        '.border-gradient-1': {
          '--bg-color': '#fff',
          border: '2px solid transparent',
          backgroundClip: 'padding-box, border-box',
          backgroundOrigin: 'padding-box, border-box',
          backgroundImage:
            'linear-gradient(to right, var(--bg-color), var(--bg-color)),linear-gradient(to right, #E023FF, #D55FFF, #5057FF, #50B5FF)',
        },
        '.border-gradient-transparent-1': {
          aspectRatio: '168 / 44',
          boxSizing: 'border-box',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center center',
          backgroundSize: 'cover',
          backgroundImage: 'url(@/assets/images/button/btn-gradient-border.svg)',
        },
        '.border-gradient-2': {
          '--bg-color': '#221433',
          border: '2px solid transparent',
          backgroundClip: 'padding-box, border-box',
          backgroundOrigin: 'padding-box, border-box',
          backgroundImage:
            'linear-gradient(to bottom, var(--bg-color), var(--bg-color)),linear-gradient(to bottom, #FFEDFE99, #280041)',
        },
      })
    }),
  ],
}
