import { cn } from '@udecode/cn'
import { LoaderCircle } from 'lucide-react'

type TButtonProps = {
  className?: string
  loading?: boolean
  children: React.ReactNode // 更新 children 类型
} & React.ButtonHTMLAttributes<HTMLButtonElement>

/**
 * Button 基础Button，修改需谨慎
 *
 */
const Button = (props: TButtonProps) => {
  const { className, children, ...rest } = props

  return (
    <button
      className={cn(
        'box-border block rounded-full px-3 py-0 text-sm font-extrabold leading-[28px] hover:cursor-pointer',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

export default Button

/**
 * Button 默认的按钮
 *
 */
export const NormalButton = (props: TButtonProps) => {
  const { children, loading, ...rest } = props

  return (
    <Button {...rest}>
      {loading ? <LoaderCircle className="m-auto block origin-center animate-spin text-inherit" /> : children}
    </Button>
  )
}

/**
 * BorderButton 带渐变边框的按钮
 *
 * 1. 带渐变边框
 * 2. 背景不透明（注：理想情况是背景透明，但要通过css实现带渐变样式的边框，背景色不能透明）
 * 3. 默认背景色为bg-gray-900
 * 4. 透明背景 注：元素宽高要与边框背景图宽高一致，默认的宽高比为168 / 44。可以更换背景图，同时更换相应的宽高比
 */

export const BorderButton = (
  props: TButtonProps & {
    bgColor?: string
    transparent?: boolean
    disabled?: boolean
  },
) => {
  const { className, loading = false, bgColor = '#261437', transparent, disabled, children, ...rest } = props
  const normalClassName = cn(transparent ? 'border-gradient-transparent-1' : 'border-gradient-1')
  const disabledClassName = 'border-[2px] border-solid opacity-25'

  return (
    <Button
      className={cn(disabled ? disabledClassName : normalClassName, className)}
      style={bgColor ? ({ '--bg-color': bgColor } as React.CSSProperties) : {}}
      disabled={disabled}
      {...rest}
    >
      {children}
      {loading && <LoaderCircle className="m-auto inline origin-center animate-spin text-inherit" />}
    </Button>
  )
}

/**
 * GradientButton 渐变背景的按钮
 *
 */
export const GradientButton = (props: TButtonProps & { gradientType?: '1' | '2'; disabled?: boolean }) => {
  const { className, disabled = false, loading = false, gradientType = '1', children, ...rest } = props
  const gradientClassName = {
    '1': 'bg-gradient-1 h-[44px] text-base font-normal',
    '2': 'bg-gradient-2 h-[44px] text-base font-normal',
  }

  // 增加disabled的变色逻辑
  const normalClassName = gradientClassName[gradientType]
  const disabledClassName = 'bg-purple-900 text-opacity-40 text-white h-[44px] text-base font-normal'
  // const normalClassName = ' bg-[#875DFF] text-white h-[44px] text-base font-normal'
  // const disabledClassName = 'bg-purple-900 text-white/60 h-[44px] text-base font-normal'

  // 在loading时，避免再次点击。通常loading时是不可以再次触发动作。
  const finalDisabled = disabled || loading

  return (
    <Button
      className={cn(disabled ? disabledClassName : normalClassName, className)}
      disabled={finalDisabled}
      {...rest}
    >
      {children}
      {loading && <LoaderCircle className="m-auto inline origin-center animate-spin text-inherit " />}
    </Button>
  )
}
