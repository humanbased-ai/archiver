import { Link } from 'lucide-react'
import { cn } from '@udecode/cn'

import tgIcon from '@/assets/icons/svg/telegram.svg'

import Popup from '@/components/ui/popup'

import { useUtils } from '@/features/tg/hooks/use-utils'

import copyToClipboard from '@/utils/copy-to-clipboard'
import { urlSafeEncode } from '@/utils/schema'
import Toast from '@/utils/toast'
import { TRACK_CATEGORY, trackEvent } from '@/utils/ga'
import { VITE_TG_APP_LINK } from '@/config'

export default function ShareModal(props: {
  shareInfo: {
    url: string
    text: string
    title: string
  }
  visible: boolean
  onClose?: () => void
}) {
  const { shareInfo } = props
  const link = `${VITE_TG_APP_LINK}?startapp=${urlSafeEncode(shareInfo?.url)}`
  const [utils, _utilsError] = useUtils()

  async function HandleCopyLink(e: { stopPropagation: () => void }) {
    e.stopPropagation()

    copyToClipboard(link)
      .then(() => {
        Toast.info('Copied!')
      })
      .catch(() => {
        Toast.info('Copy Failed!')
      })

    trackEvent(TRACK_CATEGORY.REFERRAL_COPY_CLICK, { extra: { url: link } })
  }

  function handleTgShare() {
    utils.shareURL(link, shareInfo.text)
    trackEvent(TRACK_CATEGORY.SHARE, { method: 'telegram', extra: { url: link } })
  }

  return (
    <Popup visible={props.visible} maskClass="bg-[#221433]" onClose={props.onClose}>
      <div className="px-7 pb-5 pt-3 text-center">
        <div className="pt-4">
          <h2 className="mb-2 text-base font-bold text-white">Share</h2>
          <p className="text-white">Click the invitation link to register and receive rewards</p>
        </div>
        <div className="my-6 flex items-center gap-6 overflow-x-scroll">
          <Item
            icon={<Link size={32} />}
            text={'Copy Link'}
            className="[&>.icon]:bg-gray-400"
            onClick={HandleCopyLink}
          ></Item>
          <Item icon={<object data={tgIcon} />} text="Telegram" onClick={handleTgShare}></Item>
        </div>
        <button
          className="w-full rounded-full border border-white border-opacity-15 py-2 text-white"
          onClick={() => props.onClose?.()}
        >
          Cancel
        </button>
      </div>
    </Popup>
  )
}

type ItemProps = React.HTMLAttributes<HTMLDivElement> & {
  text: string
  icon: React.ReactNode | string
  className?: string
}

function Item({ text, icon, className, ...res }: ItemProps) {
  return (
    <div className={cn('flex w-14 flex-col gap-2 whitespace-nowrap text-white', className)} {...res}>
      <div className="icon flex h-14 w-14 items-center justify-center rounded-full bg-white">
        <span className="pointer-events-none">{icon}</span>
      </div>
      <div>{text}</div>
    </div>
  )
}

