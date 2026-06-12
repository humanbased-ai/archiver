import { useEffect, useState } from 'react'
import { Button } from 'react-vant'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { cn } from '@udecode/cn'
import { sample } from 'lodash'
import React from 'react'

import TgBackButton from '@/features/tg/components/back-button'
import TransitionEffect from '@/components/ui/transition-effect'
import SvgIcon from '@/components/ui/svg-icon'
import PageHead from '@/components/page/page-head'

import coinIcon from '@/assets/icons/coin.png'
import levelAIcon from '@/assets/images/game/level-a.png'
import levelBIcon from '@/assets/images/game/level-b.png'
import levelCIcon from '@/assets/images/game/level-c.png'
import levelSIcon from '@/assets/images/game/level-s.png'
import levelSSIcon from '@/assets/images/game/level-ss.png'
import levelSSSIcon from '@/assets/images/game/level-sss.png'
import bgImage from '@/assets/images/game/game-result-bg.png'

import GameApi from '@/api/game.api'
import { TRACK_CATEGORY, trackEvent } from '@/utils/ga'
import { urlSafeEncode } from '@/utils/schema'
import { useRequest } from '@/hooks/use-request'
import { useUtils } from '@/features/tg/hooks/use-utils'

import { useUserStore } from '@/store/user.store'
import Loading from '@/features/game/components/loading'

import { VITE_TG_APP_LINK } from '@/config'


export const Component = () => {
  return (
    <TransitionEffect className="flex flex-col">
      <TgBackButton visible={true} />
      <Result />
    </TransitionEffect>
  )
}

const levelMap = {
  A: {
    icon: levelAIcon,
    bgColor: 'from-[#63B3FF]',
    textColor: 'via-[#7DD8FF]',
    tip: 'Well Played!\nKeep pushing!',
  },
  B: {
    icon: levelBIcon,
    bgColor: 'from-[#66CF7C]',
    textColor: 'via-[#66CF7C]',
    tip: 'Not Bad!\nYou’re almost there!',
  },
  C: {
    icon: levelCIcon,
    bgColor: 'from-[#575757]',
    textColor: 'via-[#D2D2D2]',
    tip: 'Don’t Give Up!\nPractice makes perfect!',
  },
  S: {
    icon: levelSIcon,
    bgColor: 'from-[#8F72EA]',
    textColor: 'via-[#B59CFF]',
    tip: 'Awesome!\nYou’re on fire!',
  },
  SS: {
    icon: levelSSIcon,
    bgColor: 'from-[#EA8872]',
    textColor: 'via-[#FF93A6]',
    tip: 'Master Level!\nKeep crushing it!',
  },
  SSS: {
    icon: levelSSSIcon,
    bgColor: 'from-[#FFDE5C]',
    textColor: 'via-[#FFEF9C]',
    tip: "Absolute pro!\nYou're unstoppable!",
  },
}
function Result() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const { data, fetch } = useRequest(() => GameApi.getResult(searchParams.get('ticker_id') || ''))
  const { ticker_count = 0, reward_value = 0, rating = 'C', cases = [] } = data || {}
  const level = rating as keyof typeof levelMap
  const config = levelMap[level] || levelMap.C

  useEffect(() => {
    setLoading(true)
    fetch().then(() => setLoading(false))
  }, [])

  const onPlayClick = () => {
    if (ticker_count <= 0) {
      return
    }

    trackEvent(TRACK_CATEGORY.GAME_PLAY_CLICK, { extra: { from: 'game_result' } })
    navigate('/game')
  }

  const onCaseDataClick = () => {
    if (!cases?.length) return

    const submission_id = sample(cases)

    trackEvent(TRACK_CATEGORY.GAME_BROWSE_CASE_DATA_CLICK, { extra: { submission_id } })
    navigate('/game/case/' + submission_id)
  }

  const onBack = () => {
    trackEvent(TRACK_CATEGORY.GAME_BACK_CLICK)

    navigate('/')
  }

  return (
    <>
      <PageHead title={'Knife Game'} onBack={onBack} className="z-10 w-full text-white" nativeBack={false}></PageHead>
      <div
        className={`relative flex h-[100vh] items-center justify-center ${config.bgColor} w-full bg-gradient-to-b to-[#000000]`}
      >
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat mix-blend-soft-light"
          style={{ backgroundImage: `url(${bgImage})` }}
        ></div>
        <div className="box-border w-full px-6">
          <object data={config.icon} className="mx-auto mb-3 w-[180px] object-contain" type="image/png"></object>
          <div
            className={`mb-3 bg-gradient-to-r from-white ${config.textColor} to-white bg-clip-text text-center text-3xl font-black italic leading-[44px] text-transparent`}
          >
            {config.tip.split('\n').map((line, index) => (
              <React.Fragment key={index}>
                {line}
                {index < config.tip.split('\n').length - 1 && <br />}
              </React.Fragment>
            ))}
          </div>
          <div className="flex items-center justify-center">
            <object data={coinIcon} className="h-[56px] object-cover" type="image/png"></object>
            <div className="ml-3 text-center">
              <div className="text-xl font-extrabold">{reward_value > 0 ? '+' + reward_value : 0}</div>
              <div className="text-[#BBBBBE]">Rewards</div>
            </div>
          </div>
          <div className="my-6">
            <div className="text-base font-extrabold">
              <Button
                className={cn('mb-6 border-none bg-[#875DFF]', ticker_count <= 0 && 'bg-gray-400')}
                block
                round
                onClick={onPlayClick}
              >
                Play ({ticker_count} left)
              </Button>
              <Button
                className={cn('mb-2 border-none bg-white text-[#1C1C26]', cases?.length ? '' : 'bg-[#808080]')}
                block
                round
                onClick={onCaseDataClick}
              >
                Browse Case Data
              </Button>
              {/* <Button className="border-none" block round>
                <span className="flex items-center">
                  <SvgIcon name="arrow-share" className="mr-2 text-2xl" /> Share Your Win
                </span>
              </Button> */}
              <Share level={level} />
            </div>
          </div>
        </div>
      </div>
      {loading && <Loading />}
    </>
  )
}

function Share({ level = 'A' }: { level: string }) {
  const { info } = useUserStore()

  const url = `tma://account/referral/${info.user_data.referee_code}?_ch=game_share`
  const link = VITE_TG_APP_LINK + '?startapp=' + urlSafeEncode(url)
  const [utils, _utilsError] = useUtils()

  useEffect(() => {
    console.log('utils.shareURL', utils, utils?.shareURL, _utilsError)
  }, [utils, _utilsError])

  function handleShareClick() {
    utils?.shareURL(
      link,
      `I’ve hit an ${level} rating—think you can beat it? Join me and let’s play to earn massive rewards together!`,
    )
    trackEvent(TRACK_CATEGORY.GAME_SHARE_CLICK, { extra: { url: link } })
  }

  return (
    <>
      <Button className="border-none" block round onClick={handleShareClick}>
        <span className="flex items-center">
          <SvgIcon name="arrow-share" className="mr-2 text-2xl" /> Share Your Win
        </span>
      </Button>
    </>
  )
}
