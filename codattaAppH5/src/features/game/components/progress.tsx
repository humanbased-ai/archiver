import React from 'react'

import dataThrowingImage from '@/assets/images/home/data-throwing.png'
import knifeGameImage from '@/assets/images/home/knife-game.png'

import { useGameStore } from '../game.store'

const LoadingScreen: React.FC = () => {
  const { loadProgress } = useGameStore()

  return (
    <div className="absolute bottom-0 left-0 right-0 top-0 flex items-center justify-center bg-[#000000E5]">
      <div>
        <object data={dataThrowingImage} className="mx-auto h-7 object-cover" type="image/png"></object>
        <object data={knifeGameImage} className="mx-auto mt-1 h-[68px] w-auto object-cover" type="image/png"></object>
        <div className="m-auto mt-7 h-2 w-[148px] overflow-hidden rounded-full border border-solid border-white">
          <div
            className="h-full w-full rounded-full bg-gradient-to-r from-[#E023FF] via-[#5057FF] via-[#D55FFF] to-[#50B5FF]"
            style={{ width: `${loadProgress}%` }}
          ></div>
        </div>
        <p className="mt-1 text-center text-sm font-bold leading-[22px]">{loadProgress}%</p>
      </div>
    </div>
  )
}

export default LoadingScreen
