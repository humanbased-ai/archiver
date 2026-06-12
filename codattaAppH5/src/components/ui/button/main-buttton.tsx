import { useState } from 'react'

import { GradientButton } from '.'

import TgMainButton from '@/features/tg/components/main-button'
import { useTgStore } from '@/store/tg.store'

type TMainButtonProps = {
  disabled?: boolean
  loading?: boolean
  className?: string
  children: string
  onClick(): void
}

export default function MainButton(props: TMainButtonProps) {
  const { disabled, loading, children = 'Submit', onClick } = props
  const [isTgError, setIsTgError] = useState(false)
  const { isTg } = useTgStore()

  return !isTg || isTgError ? (
    <GradientButton disabled={disabled} loading={loading} className="h-10 w-full transition-all" onClick={onClick}>
      {children}
    </GradientButton>
  ) : (
    <TgMainButton
      disabled={disabled}
      loading={loading}
      visible={true}
      onClick={onClick}
      onError={() => setIsTgError(true)}
    >
      {children}
    </TgMainButton>
  )
}
