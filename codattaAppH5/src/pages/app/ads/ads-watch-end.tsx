import adsApi from '@/api/ads.api'
import { useEffect, useState } from 'react'
import AnglesRight from '@/assets/images/ads/angles-right.svg'
import { Toast, Loading } from 'react-vant'
import { useUtils } from '@/features/tg/hooks/use-utils'
import PageHead from '@/components/page/page-head'
import { useNavigate } from 'react-router-dom'

interface ImageInfo {
  image_link: string
  link: string
  name?: string
}

export function Component() {
  const [imageInfo, setImageInfo] = useState<{ ads: ImageInfo } | null>()
  const [utils, _utilsError] = useUtils()
  const navigate = useNavigate()

  async function init() {
    try {
      const res = await adsApi.getAdsRedirection()
      console.log(res)
      setImageInfo(res)
    } catch (error: any) {
      Toast({ message: error.message, type: 'fail' })
    }
  }

  function openImageLink(link: string) {
    utils.openLink(link)
  }

  useEffect(() => {
    console.log(1)
    init()
  }, [])

  return (
    <>
      <PageHead title="Explore" onBack={() => navigate('/ads')}></PageHead>
      <div className="overflow-scroll p-6" style={{ height: 'calc(100% - 60px)' }}>
        <div className="flex flex-col items-center">
          <div className="mb-3">
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M30 0C13.44 0 0 13.44 0 30C0 46.56 13.44 60 30 60C46.56 60 60 46.56 60 30C60 13.44 46.56 0 30 0ZM42.09 24.6L28.08 38.58C27.66 39.03 27.09 39.2401 26.49 39.2401C25.92 39.2401 25.35 39.03 24.9 38.58L17.91 31.5901C17.04 30.7201 17.04 29.2799 17.91 28.4099C18.78 27.5399 20.22 27.5399 21.09 28.4099L26.49 33.8101L38.91 21.42C39.78 20.52 41.22 20.52 42.09 21.42C42.96 22.29 42.96 23.7 42.09 24.6Z"
                fill="#48B514"
              />
            </svg>
          </div>

          <h1 className="mb-2 text-base font-bold">Congratulations!</h1>
          <p className="text-center text-sm text-[#d1d1d1]">
            You have completed the exploration. Based on your selections, we recommend you try the following partner
            dapp.
          </p>
        </div>
        <div className="item-center mt-6 flex justify-center">
          {imageInfo ? (
            <div className="relative overflow-hidden rounded-2xl bg-[#050104]">
              <img className="w-full" src={imageInfo?.ads?.image_link} alt="" />
              <div
                className="absolute bottom-0 left-0 flex h-[48px] w-full items-center justify-between px-3 text-sm font-semibold leading-[48px] text-white"
                style={{ background: 'rgba(5,1,4,0.5)' }}
                onClick={() => openImageLink(imageInfo?.ads?.link)}
              >
                <p>Click on the picture.</p>
                <img className="h-6 w-6" src={AnglesRight} alt="" />
              </div>
            </div>
          ) : (
            <Loading />
          )}
        </div>
      </div>
    </>
  )
}
