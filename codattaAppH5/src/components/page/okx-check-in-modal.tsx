import { useOkxActivityStore } from '@/store/okx-activity.store'
import { useTonConnectUI } from '@tonconnect/ui-react'
import { useEffect, useState } from 'react'
import { okxActivityStoreActions } from '@/store/okx-activity.store'
import authApi from '@/api/auth.api'
import { Popup } from 'react-vant'
import OkxCheckInBgImage from '@/assets/images/ads/okx-checkin-bg.png'
import CoinCodatta from '@/assets/images/ads/coin-codatta.png'
import { Check, Loader2 } from 'lucide-react'
import okxActivityApi from '@/api/okx-activity.api'
import { cn } from '@udecode/cn'
import Toast from '@/utils/toast'
import { useOkxConnectUI } from '../provider/okx-connect-context-provider'

const CHECK_IN_DAY_CONFIG = [
  { day: 1, rate: 1.5 },
  { day: 3, rate: 2 },
  { day: 5, rate: 2.5 },
  { day: 7, rate: 3 },
  { day: 12, rate: 4 },
  { day: 18, rate: 5 },
]

function CheckInDayItem(props: { day: number; current: number; rate: number }) {
  const { day, current, rate } = props
  if (current >= day) {
    return (
      <>
        <div className="box-border flex items-center gap-2 rounded-lg border border-white/15 bg-[#FFF8C9] px-3 py-[5px] text-[#B56D00]">
          <div
            className="box-content flex h-8 w-8 items-center justify-center rounded-full border-[2px] border-[#FFF087] bg-[#FFD93B] text-sm font-bold"
            style={{ boxShadow: '0 2px 3px 0px #FFD93B' }}
          >
            x{rate}
          </div>
          <span className=""> Day {day}</span>
          <div className="ml-auto flex h-[18px] w-[18px] items-center justify-center rounded-full border border-[#FCC800] bg-[#FCC800] text-white">
            <Check size={13} />{' '}
          </div>
        </div>
      </>
    )
  } else {
    return (
      <>
        <div className="box-border flex items-center gap-2 rounded-lg border border-white/15 bg-[#252532] px-3 py-[5px]">
          <div className="box-content flex h-8 w-8 items-center justify-center rounded-full border-[2px] bg-gray-400 text-sm">
            x{rate}
          </div>
          <span> Day {day}</span>
          <div className="ml-auto h-[18px] w-[18px] rounded-full border"></div>
        </div>
      </>
    )
  }
}

export default function OkxCheckInModal(props: { onUpdate: () => void }) {
  const { onUpdate } = props
  const { showCheckIn, showOkxTonConnect } = useOkxActivityStore()
  const [tonConnectUI] = useTonConnectUI()
  const okxTonConnectUI = useOkxConnectUI()
  const [showPopup, setShowPopup] = useState(false)
  const [checkInDays, setCheckInDays] = useState(0)
  const [loading, setLoading] = useState(false)

  const { campaignInfo } = useOkxActivityStore()

  async function handleOnTonStatusChange(state: any) {
    if (!state) return
    if (!state.connectItems?.tonProof) return

    // todo：检查是否是okxTonWallet，否则 Toast提示：使用okx，如果是，就setShowPopup（true）
    try {
      if (/okx/i.test(state.device.appName)) {
        setShowPopup(true)
      } else {
        Toast.info('Please use OKX Wallet')
      }
    } catch (err: any) {
      tonDisconnect()
      Toast.fail(err.message)
    }
    initTonWalletConnect()
  }

  async function tonDisconnect() {
    try {
      await tonConnectUI.disconnect()
    } catch (err: any) {
      console.log(err.message)
    }
  }

  function showOkxConnect() {
    setShowPopup(false)
    okxTonConnectUI.openModal()
  }

  useEffect(() => {
    if (showOkxTonConnect) showOkxConnect()
  }, [showOkxTonConnect])

  useEffect(() => {
    if (showCheckIn) setShowPopup(true)
  }, [showCheckIn])

  async function getCheckInDays() {
    const res = await okxActivityApi.getCheckInInfo()
    setCheckInDays(res.check_in_days)
  }

  async function handleCheckInClick() {
    setLoading(true)
    try {
      const res = await okxActivityApi.campaignCheckIn()
      setCheckInDays(res.check_in_days)
      Toast.success('Check in success')
      await onUpdate()
    } catch (err: any) {
      console.log(err.message)
      Toast.fail(err.message)
    }
    setLoading(false)
  }

  async function initTonWalletConnect() {
    okxTonConnectUI.setConnectRequestParameters({ state: 'loading' })
    tonConnectUI.setConnectRequestParameters({ state: 'loading' })
    const nonce = await authApi.getNonce()
    okxTonConnectUI.setConnectRequestParameters({ state:'ready', value: { tonProof: nonce } })
    tonConnectUI.setConnectRequestParameters({ state: 'ready', value: { tonProof: nonce } })
  }

  useEffect(() => {
    getCheckInDays()
    initTonWalletConnect()

    const unsubscribe = tonConnectUI.onStatusChange((wallet: any) => {
      if (!wallet) return
      if (!wallet.connectItems?.tonProof) return
      handleOnTonStatusChange(wallet)
    })

    return () => {
      okxActivityStoreActions.resetStore()
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    const unsubscriber = okxTonConnectUI.onStatusChange((wallet:any)=>{
      if (!wallet) return
      if (!wallet.connectItems?.tonProof) return
      handleOnTonStatusChange(wallet)
    })
    return unsubscriber
  }, [])

  return (
    <Popup visible={showPopup} className="overflow-visible bg-transparent" onClose={() => setShowPopup(false)}>
      <div
        className="relative h-[576px] w-[320px] bg-contain px-4 pb-4 pt-[6px] text-white"
        style={{ backgroundImage: `url(${OkxCheckInBgImage})` }}
      >
        <img src={CoinCodatta} className="absolute -top-4 right-[10px] block w-[72px]" alt="" />
        <img src={CoinCodatta} className="absolute right-[82px] top-5 block w-[42px] -scale-x-100" alt="" />

        <div className="flex flex-col">
          <h1 className="mb-[2px] text-xl font-bold">Campaign</h1>
          <p className="mb-5 text-sm">OKX Web3 Campaign</p>
          <div className="flex h-[482px] flex-col rounded-2xl bg-[#252532] p-3">
            <h2 className="mb-1 block text-center text-sm font-bold">Daily OKX Wallet Check-in</h2>
            <p className="mb-3 block text-center text-xs text-gray-400">
              Accumulate check-ins during the campaign period to receive additional rewards.
            </p>
            <div className="mb-4 flex h-10 items-center gap-1">
              <img src={CoinCodatta} className="h-7 w-7 -scale-x-100" alt="" />
              <span className="font-bold">+10</span>
              <button
                disabled={loading || campaignInfo.check_in}
                onClick={handleCheckInClick}
                className={cn(
                  'relative top-0 ml-6 flex flex-1 shrink-0 justify-center whitespace-nowrap rounded-full border-b-[3px] border-t-0 border-b-[#0000001A] bg-[#FCC800] px-4 py-2 font-bold text-black transition-all duration-75 active:top-[3px] active:border-b-0',
                  'disabled:cursor-not-allowed disabled:bg-gray-400',
                )}
              >
                {loading ? <Loader2 className="animate-spin"></Loader2> : 'Check in'}
              </button>
            </div>
            <div className="mt-auto flex flex-col gap-2">
              {CHECK_IN_DAY_CONFIG.map((item) => {
                return (
                  <CheckInDayItem key={item.day} day={item.day} rate={item.rate} current={checkInDays}></CheckInDayItem>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </Popup>
  )
}
