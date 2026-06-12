import React, { MouseEventHandler, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CoinCodatta from '@/assets/images/ads/coin-codatta.png'
import adsApi from '@/api/ads.api'
import { Popup, Toast } from 'react-vant'
import { Loader2 } from 'lucide-react'
import { cn } from '@udecode/cn'
import Vault2BgImage from '@/assets/images/ads/vault-2-bg.png'
import BoxOfRwardsImage from '@/assets/images/ads/box-rewards.png'
import CornerCoinImage from '@/assets/images/ads/corner-coin.png'
import StakingVerification from '@/components/page/app/ads/staking-verification'
import OkxIcon from '@/assets/images/ads/okx-icon.svg'

function ClaimButton(props: { children: React.ReactNode; disabled: boolean; onClick: () => Promise<void> }) {
  const { children, onClick } = props
  const [loading, setLoading] = useState(false)

  async function handleButtonClick() {
    setLoading(true)
    await onClick()
    setLoading(false)
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={handleButtonClick}
        className="relative top-0 z-10 w-[150px] rounded-full border border-[#200d55] bg-[linear-gradient(190.97deg,#FFCB8C_8.12%,#FFA200_100%)] text-[#763F00] transition-all duration-75 active:top-[5px] disabled:top-[5px] disabled:grayscale"
      >
        {loading ? (
          <div className="flex h-10 items-center justify-center">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : (
          children
        )}
      </button>
      <div className="absolute left-0 top-[5px] h-full w-full rounded-full bg-[#200d55]"></div>
    </div>
  )
}

function AdsStage(props: {
  checked?: boolean
  expand: boolean
  onExpand: () => void
  title: string
  description: string
  onClick: () => void
  finished?: boolean
  showTail?: boolean
  disabled?: boolean
}) {
  const { checked, title, description, onClick, expand, onExpand, showTail, disabled } = props

  const handleExpandClick: MouseEventHandler<HTMLDivElement> = (e) => {
    if (disabled) return
    e.stopPropagation()
    onExpand?.()
  }

  return (
    <div className="relative pl-10">
      <div className="absolute left-0 top-0 h-full">
        {/* {checked ? */}
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cn(checked ? 'opacity-100' : 'opacity-20', 'transition-all')}
        >
          <path
            d="M14 0.666687C6.63996 0.666687 0.666626 6.64002 0.666626 14C0.666626 21.36 6.63996 27.3334 14 27.3334C21.36 27.3334 27.3333 21.36 27.3333 14C27.3333 6.64002 21.36 0.666687 14 0.666687ZM19.3733 11.6L13.1466 17.8133C12.9599 18.0133 12.7066 18.1067 12.4399 18.1067C12.1866 18.1067 11.9333 18.0133 11.7333 17.8133L8.62663 14.7067C8.23996 14.3201 8.23996 13.68 8.62663 13.2933C9.01329 12.9066 9.65329 12.9066 10.04 13.2933L12.4399 15.6934L17.96 10.1867C18.3466 9.78671 18.9866 9.78671 19.3733 10.1867C19.76 10.5734 19.76 11.2 19.3733 11.6Z"
            fill="#F3EEFF"
          />
        </svg>
        {/* : */}
        {/* <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg"> */}
        {/* <path opacity="0.2" d="M13 0.458313C6.08404 0.458313 0.458374 6.08515 0.458374 13C0.458374 19.9148 6.08404 25.5416 13 25.5416C19.916 25.5416 25.5417 19.9148 25.5417 13C25.5417 6.08515 19.916 0.458313 13 0.458313ZM13 23.7916C7.04887 23.7916 2.20837 18.9511 2.20837 13C2.20837 7.04881 7.04887 2.20831 13 2.20831C18.9512 2.20831 23.7917 7.04881 23.7917 13C23.7917 18.9511 18.9512 23.7916 13 23.7916ZM17.7017 9.65863C18.0435 10.0005 18.0435 10.5547 17.7017 10.8965L12.2569 16.3413C12.0865 16.5117 11.8626 16.598 11.6386 16.598C11.4146 16.598 11.1906 16.5128 11.0202 16.3413L8.29838 13.6195C7.95654 13.2777 7.95654 12.7234 8.29838 12.3816C8.64021 12.0398 9.19438 12.0398 9.53621 12.3816L11.6397 14.4852L16.465 9.65984C16.8069 9.31801 17.3599 9.31796 17.7017 9.65863Z" fill="#F3EEFF" /> */}
        {/* </svg> */}
        {/* } */}
        {showTail && (
          <div
            className={cn(
              'relative left-3 top-1 h-[calc(100%-20px)] w-[3px] rounded-sm bg-[#F3EEFF] transition-all',
              checked ? 'opacity-100' : 'opacity-20',
            )}
          ></div>
        )}
      </div>

      <div
        className={cn(
          'mb-4 overflow-hidden rounded-xl border border-white border-opacity-15 bg-[#D355FF] p-4',
          disabled ? 'opacity-50' : '',
        )}
        onClick={onClick}
      >
        <div className="mb-1 flex items-center justify-between">
          <div className="text-base font-bold">{title}</div>
          <div
            className={cn('text-xs transition-all', expand ? 'opacity-0' : 'opacity-100')}
            onClick={handleExpandClick}
          >
            View more &gt;
          </div>
        </div>
        <div className="flex">
          <div className={cn('min-w-0 transition-all', expand ? '' : 'max-h-10')}>
            <div className={cn('text-sm text-[#EDBBFF]', expand ? '' : 'truncate')}>{description}</div>
          </div>
          <div className={cn(expand ? 'w-0' : 'w-[40px]')}></div>
        </div>
      </div>
    </div>
  )
}

export function Component() {
  const [loading, setLoading] = useState(false)
  const [claimPoints, setClaimPoints] = useState(0)
  const [adsState, setAdsState] = useState<Codatta.Ads.AdsState | null>(null)
  const navigate = useNavigate()
  const [expand, setExpand] = useState<string>('annotation')
  const [showVerficationPopup, setShowVerficationPopup] = useState<boolean>(false)

  async function getAdsUserInfo() {
    setLoading(true)
    try {
      Toast({ message: 'Loading...', type: 'loading', duration: 0 })
      const res = await adsApi.getAdsState()
      setAdsState(res)
      setClaimPoints(res.points_to_claim ?? 0)
      Toast.clear()
    } catch (err: any) {
      Toast({ message: err.message, type: 'fail' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getAdsUserInfo()
  }, [])

  function handleUserAnnotation() {
    if (adsState?.is_add_annotation) {
      navigate('/ads/info/report', {
        state: {
          status: 'modify',
          // is_staked: adsState.is_staked,
          // is_ads_play_finished: adsState.is_ads_play_finished,
          // agreement_signed: adsState.agreement_signed,
        },
      })
    } else {
      navigate('/ads/info/report', { state: { status: 'create' } })
    }
  }

  function handleUserStaking() {
    if (!adsState?.is_add_annotation) return
    if (adsState?.is_staked) {
      navigate('/ads/withdraw')
    } else {
      navigate('/ads/staking', { state: { is_ads_play_finished: adsState.is_ads_play_finished } })
    }
  }

  function handleUserExplore() {
    console.log('ads explore', adsState?.is_ads_play_finished)
    if (!adsState?.is_add_annotation) return
    if (adsState?.is_ads_play_finished) {
      navigate('/ads/watch/end')
    } else {
      navigate('/ads/watch')
    }
  }

  async function handleClaimButtonClick() {
    if (adsState?.points_to_claim ?? 0 > 0) {
      try {
        const res = await adsApi.claimReward()
        if (res.is_need_verify) {
          setShowVerficationPopup(true)
        } else {
          const ads_state = await adsApi.getAdsState()
          setAdsState(ads_state)
          setClaimPoints(0)
          Toast.info('Gained Reward success')
        }
      } catch (err: any) {
        console.log(err)
      }
    } else if (!adsState?.is_received) {
      navigate('/ads/reward/stage')
    }
  }

  function onClickVerfication() {
    setShowVerficationPopup(false)
    navigate('/ads/verification')
  }

  return (
    <div
      className="min-h-full bg-cover bg-top bg-no-repeat px-4 py-8"
      style={{ backgroundImage: `url(${Vault2BgImage})` }}
    >
      <div className="mx-auto max-w-[480px]">
        <div className="relative mb-10">
          <img className="absolute -left-[16px] -top-[76px]" src={CornerCoinImage} alt="" />
          <img className="absolute -right-[108px] top-[20px] w-[342px]" src={BoxOfRwardsImage} alt="" />
          <div className="relative">
            <h1 className="mb-2 bg-[linear-gradient(92.92deg,#FFFFFF_3.78%,#FFD557_52.43%)] bg-clip-text text-2xl font-black text-transparent">
              Join the Ads Phase 2 Vault
              <br />
              and win rewards!
            </h1>
            <div className="mb-10">
              <Link to="/ads/reward/stage">more reward &gt;</Link>
            </div>

            <ClaimButton disabled={claimPoints === 0} onClick={handleClaimButtonClick}>
              <div className="flex items-center justify-center gap-1 px-5 py-1 font-semibold leading-8">
                {!adsState?.is_received && claimPoints === 0 ? (
                  'Get Reward'
                ) : (
                  <>
                    {claimPoints === 0 ? 'Gained' : 'Claim'}{' '}
                    <img src={CoinCodatta} className="h-8 w-8 -scale-x-100" alt="" />{' '}
                    {claimPoints === 0 ? adsState?.received_points : claimPoints}
                  </>
                )}
              </div>
            </ClaimButton>
            <div
              className="mt-3 flex h-[44px] w-[150px] items-center justify-center gap-[6px] rounded-full bg-white text-sm font-semibold text-black"
              onClick={() => navigate('/ads/okx-checkin')}
            >
              <img src={OkxIcon} className="h-6 w-6" alt="" />
              <span>OKX earn</span>
            </div>
          </div>
        </div>
        <div className="">
          <AdsStage
            showTail={true}
            expand={expand === 'annotation'}
            checked={adsState?.is_add_annotation}
            onExpand={() => setExpand('annotation')}
            title="User annotation"
            description="Material recommendations in the explore phase are recorded completely anonymously and securely. Staking enhances authenticity and can be used to increase rewards, with the possibility of offline verification."
            onClick={handleUserAnnotation}
          ></AdsStage>
          <AdsStage
            showTail={true}
            expand={expand === 'staking'}
            checked={adsState?.is_staked}
            onExpand={() => setExpand('staking')}
            title="Staking"
            description="For users participating in staking, we will randomly check the authenticity based on their labels or KYC verification. If they do not meet the standards, a community vote will determine whether to apply a slash."
            disabled={!adsState?.is_add_annotation}
            onClick={handleUserStaking}
          ></AdsStage>
          <AdsStage
            showTail={false}
            expand={expand === 'explore'}
            checked={adsState?.is_ads_play_finished}
            onExpand={() => setExpand('explore')}
            title="Explore"
            disabled={!adsState?.is_add_annotation}
            description="Based on user annotations, we will assist various Web3 projects in conducting preference experiments. Please make your choices according to your actual preferences."
            onClick={handleUserExplore}
          ></AdsStage>
        </div>
      </div>
      {showVerficationPopup && (
        <StakingVerification
          isVisible={showVerficationPopup}
          callback={onClickVerfication}
          onClose={() => setShowVerficationPopup(false)}
        />
      )}
    </div>
  )
}
