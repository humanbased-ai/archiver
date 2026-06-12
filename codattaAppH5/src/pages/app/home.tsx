import TgBackButton from '@/features/tg/components/back-button'

import TransitionEffect from '@/components/ui/transition-effect'
import UserSection from '@/components/page/app/home/user-section'
import GameSection from '@/components/page/app/home/game-section'
import bgImage from '@/assets/images/home/home-bg.png'

export const Component = () => {

  return (
    <TransitionEffect
      className="flex h-full flex-col bg-gray-900 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <TgBackButton visible={false} />
      <UserSection />
      <GameSection />
    </TransitionEffect>
  )
}
