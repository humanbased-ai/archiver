import { ArrowUpRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import codattaCoinIcon from '@/assets/icons/svg/coin.svg'
import giftImg from '@/assets/images/refferal/gift.png'

import NoData from '@/components/ui/no-data'
import Copy from '@/components/ui/copy'
import ShareModal from '@/components/ui/share-modal'

import { useReferralStore, loadInitReferralRecords } from '@/store/refferal.store'
import { useUserStore } from '@/store/user.store'
import { useNavigate } from 'react-router-dom'

import Toast from '@/utils/toast'
import { urlSafeEncode } from '@/utils/schema'
import { TRACK_CATEGORY, trackEvent } from '@/utils/ga'
import { useUtils } from '@/features/tg/hooks/use-utils'
import TransitionEffect from '@/components/ui/transition-effect'

export function Component() {

  const { info } = useUserStore()
  const [showShare, setShowShare] = useState<boolean>(false)

  const shareInfo = useMemo(() => {
    if (!info) return null

    return {
      url: `app://account/referral/${info.user_data.referee_code}`,
      text: 'Earn rewards by referring friends',
      title: 'Validation',
      description: 'Validation link',
    }
  }, [info])

  return (
    <TransitionEffect className="box-border flex h-full flex-col justify-between p-4 pb-0">
      <div>
        <h1 className="mt-3 text-center text-lg font-bold">Earn Rewards by referring friends</h1>
        <Card onShare={() => setShowShare(true)} />
        <History />
      </div>
      {
        shareInfo && <div>
          <Invite onShare={() => setShowShare(true)} shareInfo={shareInfo} />
          <ShareModal visible={showShare} shareInfo={shareInfo} onClose={() => setShowShare(false)} />
        </div>
      }

    </TransitionEffect>
  )
}

function Card({ onShare }: { onShare: () => void }) {
  const navigate = useNavigate()

  function onHistory() {
    navigate('/referral/history')
    trackEvent(TRACK_CATEGORY.REFERRAL_HISTORY_CLICK)
  }

  return (
    <div className="mt-4 rounded-2xl border border-solid border-purple-800 bg-purple-900 p-4 text-center">
      <h3 className="text-xl font-bold">Invite a friend</h3>
      <div className="m-auto inline-flex items-center text-sm leading-6">
        <img className="mr-1 block h-6 w-auto" src={codattaCoinIcon} />
        <span className="mr-3 font-semibold">+100</span>
        <span>For you and your friend</span>
      </div>
      <img className="m-auto mt-2 block h-[100px] w-auto" src={giftImg} />
      <div className="mt-6 flex items-center justify-center text-gray-300" onClick={onHistory}>
        Reward History
        <ArrowUpRight size={16} />
      </div>
      {/* <div
        className="mt-3 box-border h-[40px] rounded-full border border-solid border-white text-center text-base font-semibold leading-[38px]"
        onClick={onShare}
      >
        Share
      </div> */}
    </div>
  )
}

function History() {
  const { records, loading } = useReferralStore()

  useEffect(() => {
    loadInitReferralRecords()
  }, [])

  useEffect(() => {
    if (loading) {
      Toast.loading('Loading...')
    } else {
      Toast.clear()
    }

    return () => Toast.clear()
  }, [loading])

  return (
    <div className="mt-4 flex min-h-[100px] flex-col overflow-hidden rounded-2xl bg-gray-800">
      <header className="flex border-b border-solid border-gray-400 p-4 pb-2 text-gray-400">
        <div className="mr-4 w-[100px]">Name</div>
        <div className="w-[100px]">Reward</div>
        <div className="flex-1 text-right">Time</div>
      </header>
      <div className="flex-1 overflow-auto">
        <ul className="text-sm">
          {records.slice(0, 2)?.map((item) => {
            return (
              <li className="flex items-center px-4 py-3" key={item.address}>
                <div className="mr-4 w-[100px] truncate">{item.email || item.address}</div>
                <div className="flex w-[100px] items-center">
                  <span className="rounded-full bg-[#875DFF29] px-2 py-[2px] text-[#875DFF]">
                    {item.reward ?? 0} points
                  </span>
                </div>
                <div className="flex-1 text-right">{item.formateDate}</div>
              </li>
            )
          })}
        </ul>
        {!records?.length && !loading && (
          <div className="flex h-[120px] items-center justify-center">
            <NoData />
          </div>
        )}
      </div>
    </div>
  )
}

function Invite(props: { onShare: () => void, shareInfo: { url: string, text: string, title: string } }) {
  const { onShare, shareInfo } = props
  const link = `https://t.me/${import.meta.env.VITE_TG_BOT_NAME}/app?startapp=${urlSafeEncode(shareInfo?.url)}`
  const [utils, _utilsError] = useUtils()

  function handleShareClick() {
    utils?.shareURL(link, shareInfo.text)
    trackEvent(TRACK_CATEGORY.SHARE, { contentType: 'referral', extra: { url: link } })
  }

  function onCopied() {
    trackEvent(TRACK_CATEGORY.REFERRAL_COPY_CLICK)
  }

  return (
    <div className="sticky bottom-0">
      <div className="flex items-center gap-4 py-4">
        <div
          className="h-[44px] flex-1 cursor-pointer rounded-3xl bg-purple-500 text-center text-sm font-semibold leading-[44px]"
          onClick={handleShareClick}
        >
          Invite a friend
        </div>
        <Copy content={link} onCopied={onCopied} className="flex h-[42px] w-[42px] cursor-pointer items-center justify-center rounded-xl bg-purple-500" />
      </div>
    </div>
  )
}
