import { cn } from '@udecode/cn'

/**
 * Card 默认的卡片
 *
 */
type TCardProps = {
  className?: string
  borderType?: '1' | '2' | 'none'
  bgColor?: string //带预设边框，且边框和背景未被重置时有效
  header?: React.ReactNode | string
  children: React.ReactNode | string
  footer?: React.ReactNode | string
} & React.HTMLAttributes<HTMLDivElement>

export const Card = (props: TCardProps) => {
  const { className, borderType, bgColor, children, header, footer, ...rest } = props
  const borderClassName = {
    '1': 'border-gradient-1',
    '2': 'border-gradient-2',
    none: 'border-none',
  }

  return (
    <div
      className={cn(
        'border-1px flex flex-col rounded-2xl border-solid bg-purple-900 px-4 py-3',
        borderType && borderClassName[borderType],
        className,
      )}
      style={bgColor ? ({ '--bg-color': bgColor } as React.CSSProperties) : {}}
      {...rest}
    >
      <div className="text-tight text-base font-semibold">{header}</div>
      <div className="mt-[6px] flex-1 text-sm leading-4 text-gray-500">{children}</div>
      <div className="mt-5 text-xs font-extrabold leading-4">{footer}</div>
    </div>
  )
}

export default Card
