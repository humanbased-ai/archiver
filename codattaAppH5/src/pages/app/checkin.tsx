import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Button } from 'react-vant'
import { cn } from '@udecode/cn'

import TransitionEffect from '@/components/ui/transition-effect'

import coinImg from '@/assets/icons/coin.png'
import ticketImg from '@/assets/icons/ticket.png'

import { homePageStoreActions } from '@/store/home.store'

export const Component = () => {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [info, setInfo] = useState<{
    check_in_days: number
    reward_value: number
    ticker_count: number
  }>({
    check_in_days: 0,
    reward_value: 0,
    ticker_count: 0,
  })
  const onContinueClick = async () => {
    if (loading) return

    navigate('/')
  }

  useEffect(() => {
    setLoading(true)
    homePageStoreActions
      .checkin()
      .then((res) => {
        setInfo({
          check_in_days: res?.check_in_days || 0,
          reward_value: res?.reward_value || 0,
          ticker_count: res?.issue_ticker_count || 0,
        })
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <TransitionEffect className="box-border flex h-full flex-col items-center justify-center bg-[#1C1C26] p-6 text-center text-sm">
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="h-[148px] w-[148px] rounded-full bg-[#875DFF] text-[48px] font-black italic leading-[148px]">
          {info.check_in_days || 0}
        </div>
        <div className="mt-4 text-base font-bold">Day Check-in</div>
        <div className="mt-[64px] flex w-full items-center gap-4">
          <div className="flex-1 rounded-lg border border-solid border-[#FFFFFF1F] p-6">
            <object data={coinImg} type="image/png" className="mx-auto block h-[64px] w-auto"></object>
            <div className="font-black italic leading-5">{info.reward_value || 0}</div>
            <div className="text-[#D1D1D1]">codatta coins</div>
          </div>
          <div className="flex-1 rounded-lg border border-solid border-[#FFFFFF1F] p-6">
            <object data={ticketImg} type="image/png" className="mx-auto block h-[64px] w-auto"></object>
            <div className="font-black italic leading-5">{info.ticker_count || 0}</div>
            <div className="text-[#D1D1D1]">Play passes</div>
          </div>
        </div>
        <p className="my-4 text-center leading-[22px] text-[#D1D1D1]">
          Keep your streak going to unlock even greater rewards each day! Missing a day will reset your progress, so
          make sure to log in daily to maximize your rewards.
        </p>
        <Button
          type="default"
          round
          className={cn('mt-6 w-full bg-white font-semibold text-[#1C1C26]', loading ? 'bg-[#808080]' : '')}
          onClick={onContinueClick}
        >
          Continue
        </Button>
      </div>
    </TransitionEffect>
  )
}
