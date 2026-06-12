import React from 'react'

import knifeIcon from '@/assets/images/game/knife-mini.png'

import { useGameStore } from '../game.store'
import { LEVEL_ICON_MAP } from '../config'

const GameInfo: React.FC = () => {
  const { currrentKnives, currentRound, currentLevel } = useGameStore()

  return (
    <div className="flex justify-between px-4 pt-3">
      <div>
        <div className="text-xl font-extrabold">{currentRound?.title}</div>
        <div className="mx-auto mb-3 mt-2 flex items-center">
          <object data={knifeIcon} className="-ml-3 mr-2 h-9 object-cover" type="image/png"></object>
          <span className="text-base font-black italic">x{currrentKnives}</span>
        </div>
      </div>
      <div>
        <object
          data={LEVEL_ICON_MAP[currentLevel as keyof typeof LEVEL_ICON_MAP]}
          className="mt-3 h-auto w-[48px] object-cover"
          type="image/png"
        ></object>
      </div>
    </div>
  )
}

export default GameInfo
