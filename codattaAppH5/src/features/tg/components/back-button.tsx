import { useCallback, useEffect } from 'react'

import { useBackButton } from '../hooks/use-back-button'
import { useNavigateBack } from '@/hooks/use-navigate-back'

type TBackButtonProps = {
  visible: boolean
  disabled?: boolean
  children?: string | React.ReactNode
  onClick?(): void
  onError?(): void
}

/**
 * 1. 文本为空，按钮不显示
 * 2. backButton.setParams有坑，会反复触发更新
 * @param props
 * @returns
 */
export default function TgBackButton(props: TBackButtonProps) {
  const { visible = false, disabled = false, children, onClick, onError } = props
  const [btn, btnError] = useBackButton()

  useEffect(() => {
    if (btnError) {
      onError?.()
    }
  }, [btnError])

  useEffect(() => {
    visible ? btn?.show() : btn?.hide()
  }, [visible])

  const back = useNavigateBack()
  const onBtnClick = useCallback(() => {
    if (disabled) return false

    onClick ? onClick() : back()
  }, [disabled, onClick])

  useEffect(() => {
    btn?.on('click', onBtnClick as any)

    return () => {
      // console.log('remove click')
      btn?.off('click', onBtnClick as any)
    }
  }, [onBtnClick])

  useEffect(() => {
    return () => {
      btn?.hide()
    }
  }, [])

  return <>{children}</>
}
