/**
 * 所有svg图标 src/assets/icons/*.svg会被@spiriit/vite-plugin-svg-spritemap插件合并到一个雪碧图里
 * 坑：通过svg use方式渲染，svg内不能用渐变色
 */

import { cn } from '@udecode/cn'
import { useEffect, useState } from 'react'

interface IconBaseProps {
  name: string
}

type SvgIconProps = IconBaseProps & React.SVGProps<SVGSVGElement>
type SpanIconProps = IconBaseProps & React.ImgHTMLAttributes<HTMLSpanElement>

type IconProps = SvgIconProps | SpanIconProps

const Icon: React.FC<IconProps> = ({ name, className, ...props }) => {
  const [_spriteLoaded] = useInjectSpriteMapSvg()
  const href = `#svg-sprite-${name}`

  // console.log('spriteLoaded', spriteLoaded)
  const svgProps = props as React.SVGProps<SVGSVGElement>
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      className={cn('h-4 w-4', className)}
      {...svgProps}
    >
      <use xlinkHref={href} fill="currentColor" />
    </svg>
  )
}

export default Icon

function useInjectSpriteMapSvg() {
  const [spriteLoaded, setSpriteLoaded] = useState(false);

  useEffect(() => {
    if (!document.getElementById('svg-sprite-container')) {
      const container = document.createElement('div');
      container.id = 'svg-sprite-container';
      container.style.display = 'none';
      document.body.appendChild(container);

      // /__spritemap是占位符，会被插件@spiriit/vite-plugin-svg-spritemap替换为编译后的地址
      const spriteMapUrl = '/__spritemap'
      const fixedSpriteMapUrl = spriteMapUrl.replace(/https:\/(?!\/)/, 'https://')

      console.log("spriteMapUrl", spriteMapUrl, fixedSpriteMapUrl)
      fetch(fixedSpriteMapUrl)
        .then(response => response.text())
        .then(svg => {
          container.innerHTML = svg;
          setSpriteLoaded(true);
        })
        .catch(err => {
          console.error('Failed to load SVG sprite map:', err);
        });
    } else {
      setSpriteLoaded(true);
    }
  }, []);

  return [spriteLoaded]
}