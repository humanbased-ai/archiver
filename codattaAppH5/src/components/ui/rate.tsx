import { cn } from '@udecode/cn'
import { useEffect, useState } from 'react'

import Icon from '@/components/ui/svg-icon'

type TRateProps = {
  count: number
  size?: number
  color?: string
  bgColor?: string
  className?: string
}
/**
 * 评分组件，用于显示星星评分条。
 *
 * @param {number} rate - 星值，范围为 0 到 5。
 * @param {string} [bgColor] - 星星的背景颜色。
 * @param {number | string} size[可选] 星星的大小，以像素为单位，默认为 16。
 * @returns {JSX.Element} 评分组件。
 */
export default function Rate(props: TRateProps) {
  const { count = 0, size = 16, color = 'rgba(255, 168, 0, 0.88)', bgColor, className } = props
  const [normalizedRate, setNormalizedRate] = useState<number>(0)

  useEffect(() => {
    const tempRate = Math.min(Math.max(count, 0), 5)
    setNormalizedRate(tempRate)
  }, [count])

  return (
    <div className={cn('flex gap-0.5', className)} style={{ fontSize: `${size}px`, color }}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star value={Math.min(Math.max(normalizedRate - i, 0), 1)} key={i} bgColor={bgColor} size={size} />
      ))}
    </div>
  )
}

/**
 * 单个星星组件，用于显示评分。
 *
 * @param {number} value - 星星填充比例，范围为 0 到 1。
 * @param {string} [bgColor] - 底部星星的背景颜色。
 * @returns {JSX.Element} 星星评分组件。
 */
function Star(props: { value: number; bgColor?: string; color?: string; size?: number }) {
  const { value, bgColor = '#312440', color = '#FCC800', size = 16 } = props

  return (
    <div className="relative">
      <Icon name="star" style={{ color: bgColor, width: `${size}px`, height: `${size}px` }} />
      <span className="absolute left-0 top-0 overflow-hidden" style={{ width: `${value * 100}%` }}>
        <Icon name="star" style={{ color: color, width: `${size}px`, height: `${size}px` }} />
      </span>
    </div>
  )
}
