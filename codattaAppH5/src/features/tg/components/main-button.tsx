import { useCallback, useEffect } from 'react'
import { toRGB } from '@telegram-apps/sdk'

import { useMainButton } from '../hooks/use-main-button'

type TMainButtonProps = {
  visible: boolean
  disabled?: boolean
  loading?: boolean
  children: string
  color?: string
  bgColor?: string
  onClick?(): void
  onError?(): void
}

/**
 * 1. 文本为空，按钮不显示
 * 2. mainButton.setParams有坑，会反复触发更新
 * @param props
 * @returns
 */
export default function TgMainButton(props: TMainButtonProps) {
  const {
    visible = false,
    disabled = false,
    loading,
    children,
    color = '#FFFFFF',
    bgColor = '#D355FF',
    onClick,
    onError,
  } = props
  const disabledColor = { bgColor: toRGB('#251437'), color: toRGB('#D9D9D9') }
  const [btn, btnError] = useMainButton()

  console.log('main button ', btn, btnError)

  useEffect(() => {
    if (btnError) {
      onError?.()
    }
  }, [btnError])

  useEffect(() => {
    btn?.setParams({
      text: children?.trim(),
      textColor: disabled ? disabledColor.color : toRGB(color),
      bgColor: disabled ? disabledColor.bgColor : toRGB(bgColor),
      // isEnabled: !disabled, // 有兼容性的问题，android不生效
      isEnabled: true,
      isLoaderVisible: !!loading,
      isVisible: !!visible,
    })
  }, [visible, loading, disabled, children, color, bgColor])
  const onBtnClick = useCallback(() => {
    console.log('onBtnClick', !disabled, onClick)

    !disabled && onClick?.()
  }, [disabled, onClick])

  useEffect(() => {
    console.log('remove click')
    btn?.on('click', onBtnClick as any)

    return () => {
      console.log('remove click')
      btn?.off('click', onBtnClick as any)
    }
  }, [onBtnClick])

  useEffect(() => {
    return () => {
      btn?.hide()
    }
  }, [])

  return <></>
}
