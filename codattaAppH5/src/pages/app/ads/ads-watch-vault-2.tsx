import React, { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHead from '@/components/page/page-head'
import Button from '@/components/ui/button'
import { Swiper, Image, Loading, Overlay } from 'react-vant'
import type { SwiperInstance } from 'react-vant'
import adsApi, { AdsType } from '@/api/ads.api'
import Toast from '@/utils/toast'
import { TRACK_CATEGORY, trackEvent } from '@/utils/ga'

function AdsCom(props: { item: Codatta.Ads.AdsItem }) {
  const { item } = props
  return item.ad_type === AdsType.IMAGE ? (
    <img className="m-auto block h-full object-contain" src={item.ad_content} />
  ) : item.ad_type === AdsType.TEXT ? (
    <p>{item.ad_content}</p>
  ) : item.ad_type === AdsType.VIDEO ? (
    <video src={item.ad_content} autoPlay loop></video>
  ) : (
    <></>
  )
}

export function Component() {
  const swipeRef = useRef<SwiperInstance>(null)
  const navigate = useNavigate()
  const [adsList, setAdsList] = useState<Codatta.Ads.AdsItem[]>([])
  const [watchStartTime, setWatchStartTime] = useState(new Date().getTime())
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const postFeedback = async (isLike: boolean) => {
    const item = adsList[count]
    const watchEndTime = new Date().getTime()
    try {
      const res = await adsApi.postAdsFeedback({
        ad_id: item.ad_id,
        feedback_type: isLike ? 1 : 0,
        stay_duration: Math.ceil((watchEndTime - watchStartTime) / 1000),
        finish_play: !(count < adsList.length - 1) as boolean,
      })
      return true
    } catch (err: any) {
      Toast.fail(err!.message || 'Failed to post ads feedback')
      return false
    }
  }

  const handleBtnClick = async (isLike: boolean) => {
    if (!adsList?.length || count < 0 || count >= adsList.length) return
    if (loading) return
    trackEvent(TRACK_CATEGORY.ADS_WATCH_FEEDBACK_CLICK)
    setLoading(true)
    const res = await postFeedback(isLike)
    if (res) {
      swipeRef.current?.swipeNext()
      setWatchStartTime(new Date().getTime())
      setCount(count + 1)
      console.log(count)
      if (count + 1 >= adsList.length) {
        navigate('/ads/watch/end')
      }
    }
    setLoading(false)
    trackEvent(TRACK_CATEGORY.ADS_WATCH_ADS_ITEM, { contentType: `The ${count + 1 + 1} ads` })
  }

  const getAdsList = async () => {
    try {
      setAdsList(await adsApi.getAdsList())
    } catch (err: any) {
      Toast.fail(err?.message || 'Failed to pull Ads')
    }
    setLoading(false)
  }
  useEffect(() => {
    getAdsList()
    trackEvent(TRACK_CATEGORY.ADS_WATCH_ADS_ITEM, { contentType: `The first ads` })
  }, [])

  return (
    <>
      <PageHead title="What are you in"></PageHead>
      {loading ? (
        <Overlay
          visible={loading}
          style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Loading color="white" />
        </Overlay>
      ) : (
        <></>
      )}
      {adsList.length > 0 ? (
        <>
          <div className="custom-swiper m-auto mt-[10px] w-[343px]">
            <Swiper
              ref={swipeRef}
              loop={false}
              touchable={false}
              indicator={(total, current) => {
                return <></>
              }}
            >
              {adsList.map((item, index) => (
                <Swiper.Item key={item.ad_id}>
                  <div className="h-[calc(100vh-240px)]">
                    <div className="m-auto h-full w-full rounded-xl">
                      <AdsCom item={item} />
                    </div>
                  </div>
                  <p className="mt-6 text-center text-sm">
                    {index + 1}
                    <span className="text-gray-500"> / {adsList.length}</span>
                  </p>
                  <p className="mt-2 text-center">{item.ad_description}</p>
                </Swiper.Item>
              ))}
            </Swiper>
          </div>
          <div className="absolute bottom-0 left-0 grid h-20 w-full grid-cols-2 items-center gap-2 border-t border-solid border-t-[#FFFFFF1F] bg-transparent px-4">
            <Button
              onClick={() => handleBtnClick(true)}
              className="h-[44px] bg-white text-base font-normal text-gray-900 active:bg-purple-500 active:text-white"
            >
              Yes
            </Button>
            <Button
              onClick={() => handleBtnClick(false)}
              className="h-[44px] bg-white text-base font-normal text-gray-900 active:bg-purple-500 active:text-white"
            >
              No
            </Button>
          </div>
        </>
      ) : (
        <></>
      )}
    </>
  )
}
