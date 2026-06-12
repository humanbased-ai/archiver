import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import avatarIcon from '@/assets/images/home/avatar-default.png'
import reputationIcon from '@/assets/icons/reputation.png'
import codattaCoinIcon from '@/assets/icons/svg/coin.svg'

import Rate from '@/components/ui/rate'

import { userStoreActions, useUserStore } from '@/store/user.store'
import { homePageStoreActions } from '@/store/home.store'

import { formatNumber } from '@/utils/str'
import { trackEvent, TRACK_CATEGORY } from '@/utils/ga'

export default function HeaderSection() {
  const navigate = useNavigate()
  const { info, username } = useUserStore()

  const userPoints = useMemo(() => {
    const pointAssets = info.user_assets.find(item => item.asset_type === 'POINTS')
    return pointAssets?.balance.amount ? Number(pointAssets?.balance.amount) : 0
  }, [info])

  useEffect(() => {
    homePageStoreActions.getHomePageInfo().then((res) => {
      if (res && !res?.check_in_info.is_check_in) {
        navigate('/checkin')
      }
    })
    userStoreActions.getUserDetail()
  }, [])

  function onClickAvatar() {
    trackEvent(TRACK_CATEGORY.ACCOUNT_AVATAR_CLICK)
    navigate('/account/home')
  }

  return (
    <header className="relative z-10 px-4 pt-8">
      <div className="flex w-full items-center justify-between">
        <div className="mr-5 flex min-w-0 items-center gap-2" onClick={onClickAvatar}>
          <img
            src={info.user_data?.avatar || avatarIcon}
            className="box-border h-8 w-8 rounded-full border-[1px] border-solid border-white object-cover"
          />
          <div className="max-w-[100px] truncate text-base font-bold">{username}</div>
        </div>
        <div className="flex-items flex">
          <img className="m-auto block h-8 w-auto" src={codattaCoinIcon} />
          <div className="mr-4 text-sm font-black italic leading-8 text-gray-100">
            {formatNumber(userPoints || 0)}
          </div>
          <object data={reputationIcon} className="h-8 w-8 object-cover" type="image/png"></object>
          <div className="text-xs text-[#FFFFFFA3]">
            <div className="text-xs leading-4">
              <Rate count={info.user_reputation || 0} size={12} />
            </div>
            <div>Reputation</div>
          </div>
        </div>
      </div>
    </header>
  )
}
