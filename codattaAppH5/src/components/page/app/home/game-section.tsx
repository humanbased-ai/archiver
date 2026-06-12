import discImage from '@/assets/images/home/disc.png'
import dataThrowingImage from '@/assets/images/home/data-throwing.png'
import knifeGameImage from '@/assets/images/home/knife-game.png'
import playBtnImage from '@/assets/images/home/play-btn.png'
import playBtnDisabledImage from '@/assets/images/home/play-btn-disabled.png'
import ticketImage from '@/assets/icons/ticket.png'
import {  useHomePageStore } from '@/store/home.store'

import { ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { TRACK_CATEGORY, trackEvent } from '@/utils/ga'

export default function GameSection() {
  const navigate = useNavigate()
  const { total_ticker_count } = useHomePageStore()

  const onPlayClick = () => {
    if (total_ticker_count > 0) {
      trackEvent(TRACK_CATEGORY.GAME_PLAY_CLICK, { extra: { from: 'home' } })
      navigate('/game')
    }
  }

  const onValidationClick = () => {
    trackEvent(TRACK_CATEGORY.VALIDATION_VIEW_MORE_CLICK)
    navigate('/validation')
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="py-4">
        <object data={discImage} type="image/png" className="h-auto w-full"></object>
        <object data={dataThrowingImage} type="image/png" className="mx-auto -mt-[75px] h-[34px] w-auto"></object>
        <object data={knifeGameImage} type="image/png" className="mx-auto mt-1 h-auto w-full"></object>
        <div className="flex items-center justify-center">
          <span>
            <object data={ticketImage} type="image/png" className="mx-auto mr-2 h-auto w-[60px]"></object>
          </span>
          <span> x {total_ticker_count}</span>
        </div>
        <div>
          <object
            data={total_ticker_count > 0 ? playBtnImage : playBtnDisabledImage}
            type="image/png"
            className="mx-auto mt-1 h-auto w-[204px]"
            onClick={onPlayClick}
          ></object>
        </div>
        <div>
          <div className="mx-auto rounded-lg w-[204px] mt-3 h-[42px] flex items-center justify-center leading-10 border-[1px] border-[#FFFFFF] text-xs " onClick={onValidationClick}>
            Validation 
          </div>
        </div>
      </div>
    </div>
  )
}
