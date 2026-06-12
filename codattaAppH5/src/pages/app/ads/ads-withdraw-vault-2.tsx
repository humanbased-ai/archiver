import adsApi from '@/api/ads.api'
import SafeSecured from '@/components/page/app/ads/safe-secured'
import { useEffect, useState } from 'react'
import { Popup, Toast } from 'react-vant'
import { beginCell, toNano, Address, Cell } from '@ton/core'
import tonIcon from '@/assets/icons/ton-logo.svg'
import codattaIcon from '@/assets/images/ads/codatta-icon.png'
import {
  CHAIN,
  ConnectedWallet,
  SendTransactionRequest,
  useTonConnectUI,
  toUserFriendlyAddress,
} from '@tonconnect/ui-react'
import authApi from '@/api/auth.api'
import { useUtils } from '@/features/tg/hooks/use-utils'
import { useNavigate } from 'react-router-dom'
import { GradientButton } from '@/components/ui/button'
import ErrorIconSvg from '@/assets/images/ads/error-icon.svg'
import PendingIcon from '@/assets/images/ads/pending-icon.svg'
import dayjs from '@/utils/dayjs'
import { cn } from '@udecode/cn'
import ArrowLeft from '@/assets/images/ads/angle-left.svg'
import PageHead from '@/components/page/page-head'
import StakingVerification from '@/components/page/app/ads/staking-verification'

const CONTRACT_OP = {
  staking: 0x9b18ba90,
  redeem: 0xcb03bfaf,
}
const NETWORK = import.meta.env.VITE_WALLET_NETWORK_CHAIN

function StakingPending() {
  return (
    <div className="mt-[32px] flex flex-col items-center gap-2 px-8">
      <img src={PendingIcon} alt="" className="h-[72px] w-[72px]" />
      <h1 className="px-6 text-center text-base font-bold">
        Your staking transaction is currently being processed. Please stay tuned for further updates.
      </h1>
    </div>
  )
}

function WithdrawSuccess(props: {
  stakingInfo?: Codatta.Ads.AdsStakeInfo
  redemptionInfo?: Codatta.Ads.AdsRedemptionInfo
}) {
  const { stakingInfo, redemptionInfo } = props
  console.log(redemptionInfo?.redemption_amount)
  return (
    <div className="mx-auto mt-8 flex w-[310px] flex-col items-center">
      <div className="mb-3">
        <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M30 0C13.431 0 0 13.431 0 30C0 46.569 13.431 60 30 60C46.569 60 60 46.569 60 30C60 13.431 46.569 0 30 0ZM27.75 16.5C27.75 15.258 28.758 14.25 30 14.25C31.242 14.25 32.25 15.258 32.25 16.5V30.2131C32.25 31.4551 31.242 32.4631 30 32.4631C28.758 32.4631 27.75 31.4551 27.75 30.2131V16.5ZM30.0601 43.5C28.4041 43.5 27.0447 42.156 27.0447 40.5C27.0447 38.844 28.374 37.5 30.03 37.5H30.0601C31.7191 37.5 33.0601 38.844 33.0601 40.5C33.0601 42.156 31.7161 43.5 30.0601 43.5Z"
            fill="#48B514"
          />
        </svg>
      </div>
      <h1 className="mb-2 text-base font-bold">Withdraw Successful</h1>
      <p className="mb-3 text-center text-sm leading-[22px] text-gray-300">
        You have withdrawn a total of {redemptionInfo?.redemption_amount}{' '}
        {redemptionInfo?.redemption_type === 'TON_COIN' ? 'U' : 'points'} on{' '}
        {dayjs(stakingInfo?.redemption_order?.gmt_create).format('YYYY/MM/DD HH:mm:ss')}
      </p>
      {['FATAL', 'EXPIRED'].includes(stakingInfo?.verify_status!) && (
        <div className="mb-11 rounded-xl bg-[#252532] p-4 text-center text-sm text-gray-300">
          - Your interest has been reduced due to discrepancies between your user annotation and the actual data. Stay
          engaged with Codatta Vault for updates, and feel free to try again next time.
        </div>
      )}
    </div>
  )
}

function StakeError(props: { link?: string }) {
  const navigate = useNavigate()
  const [utils, _utilsError] = useUtils()
  const { link } = props

  function hanleRetry() {
    navigate('/ads/staking', { state: { retry: true } })
  }

  function handleButtonClick() {
    link && utils.openLink(link)
  }

  return (
    <div className="flex flex-col items-center gap-2 px-8">
      <img src={ErrorIconSvg} alt="" className="w-15 h-15" />
      <h1 className="text-base font-bold">Staking Unsuccessful</h1>
      <p className="mb-2 text-center text-sm text-gray-400">
        Unfortunately, your transaction did not go through, resulting in a missed staking opportunity. We apologize for
        any inconvenience. Please stay tuned for future chances to participate.
      </p>
      <div className="absolute bottom-6 left-0 flex w-full flex-col gap-2 px-4">
        <GradientButton onClick={hanleRetry} className="mt-6 w-full text-base font-bold leading-10">
          Retry Staking
        </GradientButton>
        {link ? (
          <button
            className="mt-4 rounded-full border border-white bg-transparent px-6 py-2 text-white"
            onClick={handleButtonClick}
          >
            Transaction details
          </button>
        ) : (
          ''
        )}
      </div>
    </div>
  )
}

function WithdrawAction(props: {
  stakingInfo?: Codatta.Ads.AdsStakeInfo
  redemptionInfo?: Codatta.Ads.AdsRedemptionInfo
  onUpdate: () => void
}) {
  const { stakingInfo, redemptionInfo, onUpdate } = props
  const [tonConnectUI] = useTonConnectUI()
  // const [stakeType, setStakeType] = useState<string>('TON')
  const [walletInfo, setWalletInfo] = useState<ConnectedWallet | null>()
  const [showSwitchWallet, setShowSwitchWallet] = useState<boolean>(false)
  const [isRedeemed, setIsRedeemed] = useState<boolean>(false)
  const [showVerficationPopup, setShowVerficationPopup] = useState<boolean>(false)

  const navigate = useNavigate()

  async function commitWithdraw(contractAddress: string, amount: number, comment?: string) {
    // setStakingLoading(true)
    if (redemptionInfo === null) return
    const sig_data_buffer = Buffer.from(redemptionInfo!.sig_data, 'hex')
    const signature_buffer = Buffer.from(redemptionInfo!.signature, 'hex')
    const message = beginCell()
      .storeUint(CONTRACT_OP.redeem, 32)
      .storeUint(redemptionInfo?.queryID !== undefined ? redemptionInfo.queryID : 0, 64)
      .storeUint(!!redemptionInfo?.slashed ? 1 : 0, 4)
      .storeUint(sig_data_buffer.length * 8, 32)
      .storeUint(signature_buffer.length * 8, 32)

      .storeRef(beginCell().storeBuffer(sig_data_buffer, sig_data_buffer.length).endCell())
      .storeRef(beginCell().storeBuffer(signature_buffer, signature_buffer.length).endCell())
      .endCell()
    console.log(message.toBoc().byteLength)
    const stackTransaction: SendTransactionRequest = {
      validUntil: Math.floor(Date.now() / 1000) + 60,
      network: NETWORK,
      messages: [
        {
          address: contractAddress,
          amount: toNano(amount.toString()).toString(),
          payload: message.toBoc().toString('base64'),
        },
      ],
    }

    const response = await tonConnectUI.sendTransaction(stackTransaction, {})
    return response
  }

  async function handleWithdraw() {
    const contractAddress = stakingInfo?.staking_contract_address!
    // const contractAddress = 'EQDegdoJ6xk0xRTf8T3T0_Lc7UAX4UHfSqn9r9pgqefHQcnK'
    try {
      const result = await commitWithdraw(contractAddress, redemptionInfo?.redemption_amount ?? 0)
      console.log(result)
      if (result) {
        console.log(
          Cell.fromBase64(result?.boc)
            .hash()
            .toString('hex'),
        )
      }

      const res = await adsApi.saveRedemption({
        chain: 'TON',
        staking_order_id: redemptionInfo!.staking_order_id,
        tx_hash: redemptionInfo!.staking_tx_hash,
      })
      console.log(res)
      onUpdate()
    } catch (error: any) {
      console.log(error)
      Toast({ message: error.message, type: 'fail' })
    }
  }

  async function handleTonConnect() {
    tonConnectUI.setConnectRequestParameters({ state: 'loading' })
    tonConnectUI.modal.open()
    const nonce = await authApi.getNonce()
    tonConnectUI.setConnectRequestParameters({ state: 'ready', value: { tonProof: nonce } })
  }

  async function handleWithdrawClick() {
    if (redemptionInfo?.need_verify && redemptionInfo?.verify_status !== 'FINISHED') {
      setShowVerficationPopup(true)
      return
    }
    if (redemptionInfo?.redemption_type === 'POINT') {
      const res = await adsApi.redemptionPoints({ staking_order_id: stakingInfo?.staking_order?.staking_order_id! })
      onUpdate()
      return
    }
    const address = tonConnectUI.account?.address
    console.log(address, redemptionInfo?.address)
    if (!tonConnectUI.connected) {
      handleTonConnect()
    } else if (address === redemptionInfo?.address) {
      handleWithdraw()
    } else {
      setShowSwitchWallet(true)
    }
  }

  useEffect(() => {
    const currentTimeStamp = dayjs().valueOf()
    const redemptionTimeStamp = dayjs(redemptionInfo?.permit_date).valueOf()
    if (
      stakingInfo?.staking_order?.status === 'FINISHED' &&
      redemptionInfo?.need_verify &&
      redemptionInfo.verify_status === 'PENDING'
    ) {
      setTimeout(() => {
        Toast({
          message: 'The verification is currently being processed. Please stay tuned for further updates.',
          duration: 5000,
        })
      }, 0)
    }
    if (
      (redemptionInfo?.need_verify && redemptionInfo.verify_status === 'PENDING') ||
      currentTimeStamp < redemptionTimeStamp
    ) {
      setIsRedeemed(false)
    } else {
      setIsRedeemed(true)
    }
  }, [redemptionInfo])

  function onVerificationPopupClose() {
    setShowVerficationPopup(false)
    navigate('/ads/verification')
  }

  function onSwitchWallet() {
    setShowSwitchWallet(false)
    handleTonConnect()
  }

  useEffect(() => {
    return tonConnectUI.onStatusChange(setWalletInfo)
  }, [])

  return (
    <>
      {['FAILED', 'INIT'].includes(stakingInfo?.staking_order?.status!) && (
        <StakeError link={stakingInfo?.staking_order?.transaction_detail} />
      )}
      {stakingInfo?.staking_order?.status === 'PENDING_CONFIRM' && <StakingPending />}
      {stakingInfo?.staking_order?.status === 'FINISHED' && !stakingInfo?.redemption_order && (
        <div className="rounded-2xl border border-white border-opacity-15 bg-[#252532] p-4">
          <div className="mb-6">
            <h2>Withdraw</h2>
            {isRedeemed && (
              <p className="mt-1 text-sm leading-[22px] text-[BBBBBE]">Your staking is available for withdrawal.</p>
            )}
          </div>

          <div className="mb-6 rounded-lg border border-white border-opacity-15 text-sm">
            <div className="flex items-center gap-2 border-b border-white border-opacity-10 px-3 py-4">
              {redemptionInfo?.redemption_type === 'TON_COIN' ? (
                <>
                  <img src={tonIcon} className="h-6 w-6" alt="" />
                  <span>TON</span>
                </>
              ) : (
                <>
                  <img src={codattaIcon} className="h-6 w-6" alt="" />
                  <span>codatta</span>
                </>
              )}
            </div>
            {redemptionInfo?.redemption_type === 'TON_COIN' ? (
              <div className="flex items-center justify-between border-b border-white border-opacity-10 px-3 py-4">
                <span className="text-[#d1d1d1]">Address</span>
                <span className="inline-block w-[70%] overflow-hidden text-ellipsis text-white">
                  {redemptionInfo?.address ? toUserFriendlyAddress(redemptionInfo?.address) : ''}
                </span>
              </div>
            ) : (
              ''
            )}

            <div className="flex items-center justify-between border-b border-white border-opacity-10 px-3 py-4">
              <span className="text-[#d1d1d1]">Staked</span>
              <span className="text-white">{redemptionInfo?.redemption_amount}</span>
            </div>
            <div className="flex items-center justify-between border-b border-white border-opacity-10 px-3 py-4">
              <span className="text-[#d1d1d1]">Final Amount</span>
              <span className="text-white">
                {(redemptionInfo?.interest_amount ?? 0) + (redemptionInfo?.redemption_amount ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-white border-opacity-10 px-3 py-4">
              <span className="text-[#d1d1d1]">Redemption time</span>
              <span className="text-white">{dayjs(redemptionInfo?.permit_date).format('YYYY/MM/DD HH:mm:ss')}</span>
            </div>
          </div>
          <div>
            <button
              className="w-full rounded-full bg-[#D355FF] py-3 text-sm text-white disabled:bg-opacity-10 disabled:text-opacity-50"
              disabled={!isRedeemed}
              onClick={handleWithdrawClick}
            >
              Claim
            </button>
          </div>

          <Popup
            className="rounded-t-3xl bg-[#252532] text-white"
            style={{ width: '90%' }}
            round
            visible={showSwitchWallet}
            onClose={() => setShowSwitchWallet(false)}
          >
            <div className="p-4">
              <span>To redeem, please switch to the staking wallet to continue.</span>
              <div>
                <button className="mt-4 w-full rounded-full bg-primary p-3 text-sm text-white" onClick={onSwitchWallet}>
                  Switch wallet
                </button>
              </div>
            </div>
          </Popup>
          {showVerficationPopup && (
            <StakingVerification
              isVisible={showVerficationPopup}
              callback={onVerificationPopupClose}
              onClose={() => setShowVerficationPopup(false)}
            />
          )}
        </div>
      )}
      {stakingInfo?.redemption_order?.redemption_order_id && isRedeemed && (
        <WithdrawSuccess stakingInfo={stakingInfo} redemptionInfo={redemptionInfo} />
      )}
    </>
  )
}

export function Component() {
  const [stakingInfo, setStakingInfo] = useState<Codatta.Ads.AdsStakeInfo>()
  const [redemptionInfo, setRedemptionInfo] = useState<Codatta.Ads.AdsRedemptionInfo>()
  const [safeInfo, setSafeInfo] = useState<{ guaranteeUrl: string; contractUrl: string }>({
    guaranteeUrl: '',
    contractUrl: '',
  })

  async function getStakeAndRedemptionInfo() {
    try {
      Toast({ message: 'Loading...', type: 'loading', duration: 0 })
      const [stakeRes, redempRes] = await Promise.allSettled([adsApi.consultStake(), adsApi.consultRedemption()])
      if (stakeRes.status === 'fulfilled') {
        setStakingInfo(stakeRes.value)
        setSafeInfo({
          guaranteeUrl: stakeRes.value.guarantee_url,
          contractUrl: stakeRes.value.contract_exhibit_url,
        })
      }

      redempRes.status === 'fulfilled' && setRedemptionInfo(redempRes.value)

      Toast.clear()
    } catch (err: any) {
      Toast.clear()
      Toast({ message: err.message, type: 'fail' })
    }
  }

  useEffect(() => {
    getStakeAndRedemptionInfo()
  }, [])

  return (
    <>
      <PageHead title="Withdraw"></PageHead>
      <div className="p-4">
        <div className="mb-4">
          <SafeSecured guaranteeUrl={safeInfo?.guaranteeUrl} contractUrl={safeInfo?.contractUrl} />
        </div>
        <WithdrawAction
          stakingInfo={stakingInfo}
          redemptionInfo={redemptionInfo}
          onUpdate={getStakeAndRedemptionInfo}
        ></WithdrawAction>
      </div>
    </>
  )
}
