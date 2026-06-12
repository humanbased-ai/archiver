import { useNavigate } from 'react-router-dom'

import TransitionEffect from '@/components/ui/transition-effect'
import TgBackButton from '@/features/tg/components/back-button'

import { Game } from '@/features/game/main'

import bgImg from '@/assets/images/game/bg.png'

export const Component = () => {
  const navigate = useNavigate()

  const onBack = () => {
    navigate('/')
  }

  return (
    <TransitionEffect
      className="flex h-full flex-1 flex-col bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${bgImg})` }}
    >
      <TgBackButton visible={true} onClick={onBack} />
      <Game />
    </TransitionEffect>
  )
}
