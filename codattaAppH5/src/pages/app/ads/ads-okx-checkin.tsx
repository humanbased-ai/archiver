import { useEffect, useMemo, useRef, useState } from 'react'
import { GradientButton } from '@/components/ui/button'
import { adsStoreActions, useAdsStore } from '@/store/ads.store'
import ShareModal from '@/components/ui/share-modal'
import { useUserStore } from '@/store/user.store'
import usdtIcon from '@/assets/images/ads/usdt-icon.png'

import { useNavigate } from 'react-router-dom'
import DailyCheckInImage from '@/assets/images/ads/daily-check-in.png'
import USDTStackImage from '@/assets/images/ads/usdt-stack.png'
import TONStackImage from '@/assets/images/ads/ton-stack.png'
import OkxWalletQuestImage from '@/assets/images/ads/wallet-quest.png'
import { okxActivityStoreActions, useOkxActivityStore } from '@/store/okx-activity.store'
import PageBg from '@/assets/images/ads/vault-bg.png'
import PageBgCoinImage from '@/assets/images/ads/vault-coin.png'
import { cn } from '@udecode/cn'
import OkxCheckInModal from '@/components/page/okx-check-in-modal'
import { Check, Loader2 } from 'lucide-react'
import { useTonConnectUI } from '@tonconnect/ui-react'
import Toast from '@/utils/toast'
import CoinCodatta from '@/assets/images/ads/coin-codatta.png'
import TransitionEffect from '@/components/ui/transition-effect'
import QuestionCircle from '@/assets/images/ads/question-circle.svg'
import { useUtils } from '@/features/tg/hooks/use-utils'
import PageHead from '@/components/page/page-head'
import { useOkxConnectUI } from '@/components/provider/okx-connect-context-provider'

function ChampionCheckIcon() {
  return (
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-black">
      <Check size={16}></Check>
    </div>
  )
}

export const Component = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [checkInLoading, setCheckInLoading] = useState(false)
  const { adsState } = useAdsStore()
  const [showShare, setShowShare] = useState(false)
  const [tonConnectUI] = useTonConnectUI()
  const okxTonConnectUI = useOkxConnectUI()
  const { campaignInfo } = useOkxActivityStore()
  const [utils, _utilsError] = useUtils()
  const { info } = useUserStore()
  const container = useRef<HTMLDivElement>(null)
  const [claimLoading, setClaimLoading] = useState(false)

  const shareInfo = useMemo(() => {
    if (!info) return null
    return {
      url: `app://account/referral/${info.user_data.referee_code}`,
      text: 'Earn rewards by referring friends',
      title: 'Ads',
      description: 'Ads link',
    }
  }, [info])

  async function handleOkxCheckIn() {
    console.log(okxTonConnectUI.wallet?.device.appName)
    const isOkxConnectConnected = okxTonConnectUI.connected && okxTonConnectUI.wallet && /okx/i.test(okxTonConnectUI.wallet?.device.appName)
    const isTonConnectConnected = tonConnectUI.connected && tonConnectUI.wallet && /okx/i.test(tonConnectUI.wallet.device.appName)
    if (!isOkxConnectConnected || !isTonConnectConnected)
      try {
        await tonConnectUI.disconnect()
      } catch (err: any) {
        console.log(err.message)
      }
    if (isTonConnectConnected || isOkxConnectConnected) okxActivityStoreActions.showCheckInModal()
    else okxActivityStoreActions.showConnectModal()
  }

  const targetPage = useMemo(() => {
    if (adsState.is_redemption) return '/ads/withdraw/result'
    if (!adsState.agreement_signed) return '/ads/agreement'
    if (!adsState.is_add_annotation) return '/ads/info'
    if (!adsState.is_staked && !adsState.is_ads_play_finished) return '/ads/stake'
    if (!adsState.is_staked && adsState.is_ads_play_finished) return '/ads/end'
    if (adsState.is_staked && !adsState.is_ads_play_finished) return '/ads/introduce'
    if (adsState.is_staked && adsState.is_ads_play_finished) return '/ads/withdraw'
  }, [adsState])

  function handlLearnMoreClick() {
    targetPage && navigate(targetPage)
  }

  async function getAdsState() {
    setLoading(true)
    const success = await adsStoreActions.getAdsState()
    setLoading(false)
  }

  async function getCampaignInfo() {
    setCheckInLoading(true)
    try {
      await okxActivityStoreActions.getCampaignInfo()
    } catch (err: any) {
      console.error(err.message)
    }
    setCheckInLoading(false)
  }

  useEffect(() => {
    getAdsState()
    getCampaignInfo()
  }, [])

  async function handleClaimExtraPoint() {
    setClaimLoading(true)
    try {
      await okxActivityStoreActions.claimReward()
      await okxActivityStoreActions.getCampaignInfo()
      Toast.success('Claim success')
    } catch (err: any) {
      Toast.fail(err.message)
    }
    setClaimLoading(false)
  }

  function handleStakingClick() {
    if (campaignInfo.staking) return
    if (adsState.is_add_annotation) navigate(`/ads/watch`)
    else navigate('/ads/info/report', { state: { status: 'create' } })
  }

  function handleAdsQuestClick() {
    if (campaignInfo.ads_quest) return
    navigate('/quest')
  }

  const handleMoreInfoClick = () => {
    utils.openLink('https://gist.github.com/CodattaUpdates/168f4b28e0c9abfc851543057a5d18e3', { tryInstantView: true })
  }

  return (
    <TransitionEffect className={cn('h-full')}>
      <PageHead />
      <div
        className="min-h-screen w-full bg-black bg-[100%_auto] bg-top bg-no-repeat pb-5"
        style={{ backgroundImage: `url(${PageBg})` }}
      >
        {/* <div className="pt-6 text-center text-base font-bold">
          <h1>New Feature!</h1>
        </div> */}
        <div className="mb-[52px] min-h-full px-4">
          <img src={PageBgCoinImage} className="mx-auto block w-[278px]" alt="" />
          <h2 className="mb-2 text-base font-bold">OKX Wallet Campaign</h2>
          <div className="mb-4 text-gray-300">
            Participate in the OKX special campaign to earn massive points and a chance to win Toncoin rewards!
          </div>
          <div className="mb-4 flex flex-col gap-3">
            <div
              className={cn(
                'flex items-center gap-2 rounded-xl border border-[#ffffff20] p-3',
                campaignInfo.check_in ? 'gradient-border-2' : '',
              )}
            >
              <img src={DailyCheckInImage} className="w-8" alt="" />
              <span>Check in daily reward</span>
              <div className="ml-auto flex h-[43px] items-center">
                {campaignInfo.check_in ? (
                  <ChampionCheckIcon></ChampionCheckIcon>
                ) : checkInLoading ? (
                  <Loader2 className="animate-spin"></Loader2>
                ) : (
                  <button
                    onClick={handleOkxCheckIn}
                    disabled={checkInLoading}
                    className="relative top-0 ml-auto shrink-0 self-end whitespace-nowrap rounded-full border-b-[3px] border-t-0 border-b-[#0000001A] bg-[#FCC800] px-4 py-2 font-bold text-black transition-all duration-75 active:top-[3px] active:border-b-0"
                  >
                    Check in
                  </button>
                )}
              </div>
            </div>

            <div
              onClick={handleStakingClick}
              className={cn(
                'flex items-center gap-2 rounded-xl border border-[#ffffff20] p-3',
                campaignInfo.staking ? 'gradient-border-2' : '',
              )}
            >
              <img src={TONStackImage} className="w-8" alt="" />
              <span className="">Participate for a chance to win TON coin</span>
              <div className="ml-auto flex h-[43px] items-center">
                {campaignInfo.staking && <ChampionCheckIcon></ChampionCheckIcon>}
              </div>
            </div>

            {/* <div onClick={handleAdsQuestClick} className={cn('flex items-center gap-2 border border-[#ffffff20] rounded-xl p-3', campaignInfo.ads_quest ? 'gradient-border-2' : '')}>
            <img src={OkxWalletQuestImage} className='w-8' alt="" />
            <span className='leading-[43px]'>Complete OKX wallet sign-in quest</span>
            <div className='h-[43px] ml-auto flex items-center'>
              {campaignInfo.ads_quest && <ChampionCheckIcon></ChampionCheckIcon>}
            </div>
          </div> */}
          </div>
          <div>
            <GradientButton
              disabled={!campaignInfo.claim_receive}
              className="flex w-full items-center justify-center gap-2"
              onClick={handleClaimExtraPoint}
            >
              {' '}
              {claimLoading ? (
                <Loader2 className="animate-spin"></Loader2>
              ) : (
                <>
                  Claim 400 Codatta Points
                  <img
                    src={CoinCodatta}
                    className={cn('h-7 w-7', campaignInfo.claim_receive ? '' : 'opacity-40 grayscale')}
                    alt=""
                  />
                </>
              )}
            </GradientButton>
          </div>
        </div>

        {/* <div className="flex w-full flex-1 items-center justify-center px-4 text-white pb-10" ref={container}>
        <div>
          <h1 className="mb-2 text-lg font-bold">Explore the Codatta Vault</h1>
          <p className="mb-6 text-sm text-gray-300">Store, manage, and monetize your data with the Codatta Vault. A great way to earn is through Web3 Ads. Start your privacy-preserving personalization experience on Web3 right now!</p>
          <GradientButton
            disabled={loading}
            onClick={handlLearnMoreClick}
            className="w-full text-base font-bold leading-10"
          >
            Go
          </GradientButton>
          <div className='flex justify-center items-center mt-3 gap-1 px-1 text-sm leading-[22px] cursor-pointer' onClick={handleMoreInfoClick}>more information <img className='w-[18px] h-[18px]' src={QuestionCircle} alt="" /></div>
        </div>
      </div> */}
        {shareInfo && (
          <div>
            <ShareModal visible={showShare} shareInfo={shareInfo} onClose={() => setShowShare(false)} />
          </div>
        )}

        <OkxCheckInModal onUpdate={getCampaignInfo} />
      </div>
      {/* <PageHead title="OKX Check in"></PageHead> */}
    </TransitionEffect>
  )
}
