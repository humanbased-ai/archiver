import adsApi from '@/api/ads.api'
import CoinStageImage1 from '@/assets/images/ads/coin-stage-1.png'
import CoinStageImage2 from '@/assets/images/ads/coin-stage-2.png'
import CoinStageImage3 from '@/assets/images/ads/coin-stage-3.png'
import CoinStageImage4 from '@/assets/images/ads/coin-stage-4.png'
import React, { useEffect, useState } from 'react'
import PageHead from '@/components/page/page-head'

interface StageConfig {
  message: string
  show_reward: number
}
interface ReardConfig {
  activity_info: Array<StageConfig>
  annotation_level: number
  is_received: boolean
  points_to_claim: number
  received_points: number
}

const images = [CoinStageImage4, CoinStageImage3, CoinStageImage2, CoinStageImage1]

function CoinStage(props: { config: StageConfig; idx: number }) {
  const { config, idx } = props
  return (
    <div className="flex gap-4 rounded-2xl border border-white border-opacity-15 p-4">
      <div className="flex w-20 shrink-0 items-center justify-center">
        <img src={images[idx]} className="h-16" alt="" />
      </div>
      <div>
        <div className="text-lg font-semibold leading-6 text-white">{config.show_reward} Points</div>
        <p className="text-sm text-gray-400">{config.message}</p>
      </div>
    </div>
  )
}

export function Component() {
  const [rewardConfig, setRewardConfig] = useState<ReardConfig | null>(null)
  const [annotationLevel, setAnnotationLevel] = useState<number>(0)

  async function getRewardConfig() {
    const res = await adsApi.getReardConfig()
    setRewardConfig(res)
  }

  useEffect(() => {
    if (rewardConfig === null) return
    const idx = rewardConfig.activity_info
      .reverse()
      .findIndex((item) => item.show_reward >= rewardConfig.received_points)
    setAnnotationLevel((idx + 1) * (100 / rewardConfig.activity_info.length))
  }, [rewardConfig])

  useEffect(() => {
    getRewardConfig()
  }, [])

  return (
    <>
      <PageHead title="Vault reward criteria"></PageHead>
      <div className="flex items-stretch justify-center gap-6 px-6 py-12">
        <div className="relative w-[6px] overflow-hidden rounded-[36px] bg-[#474650]">
          <div
            className="absolute bottom-0 top-0 w-full rounded-[36px] bg-[#D355FF] transition-all"
            style={{
              height: `${annotationLevel}%`,
              top: `${100 - annotationLevel}%`,
            }}
          ></div>
        </div>
        <div className="flex-1">
          <div className="flex flex-col gap-6">
            {rewardConfig?.activity_info
              .reverse()
              .map((item, index) => <CoinStage config={item} idx={index} key={index}></CoinStage>)}
          </div>
        </div>
      </div>
    </>
  )
}
