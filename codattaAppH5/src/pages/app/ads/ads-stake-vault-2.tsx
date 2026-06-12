import { useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronRight, Loader2 } from 'lucide-react'
import {
  CHAIN,
  ConnectedWallet,
  SendTransactionRequest,
  useTonConnectUI,
  toUserFriendlyAddress,
} from '@tonconnect/ui-react'

import authApi from '@/api/auth.api'
import { beginCell, toNano, Address } from '@ton/core'
import { TonClient } from '@ton/ton'
import { getHttpEndpoint } from '@orbs-network/ton-access'
import { Popup, Switch } from 'react-vant'
import adsApi, { StakeType } from '@/api/ads.api'
import { cn } from '@udecode/cn'
import { Cell } from '@ton/core'
import { TRACK_CATEGORY, trackEvent } from '@/utils/ga'
import TonIconSvg from '@/assets/icons/svg/ton.svg'
import codattaIcon from '@/assets/images/ads/codatta-icon.png'
import SafeSecured from '@/components/page/app/ads/safe-secured'
import { Toast } from 'react-vant'
import { useAuthStore } from '@/store/auth.store'
import PageHead from '@/components/page/page-head'

const CONTRACT_OP = {
  staking: 0x9b18ba90,
  redeem: 0xcb03bfaf,
}
// Contract deployed at address EQBI4nm8Uj5BF4UqTrOA89c5i6y5cDc3U5zRbZL8pp2qDQH7
// You can view it at https://testnet.tonscan.org/address/EQBI4nm8Uj5BF4UqTrOA89c5i6y5cDc3U5zRbZL8pp2qDQH7

// TODO 这个是USDT jetton master的合约地址，请注意区分测试环境和线上环境
const NETWORK = import.meta.env.VITE_WALLET_NETWORK_CHAIN

function StakingConfirmPopup(props: {
  onContinue: () => void
  onChangeWallet: () => void
  onClose: () => void
  amount: number
  balance?: bigint
  balanceStr?: string
  visible: boolean
}) {
  const { onClose, onContinue, amount, visible, onChangeWallet, balance, balanceStr } = props

  const canContinue = useMemo(() => {
    return balanceStr && amount && Number(balanceStr) >= amount
  }, [balanceStr, amount])

  return (
    <Popup
      className="rounded-t-3xl bg-[#252532] text-white"
      position="bottom"
      safeAreaInsetBottom
      visible={visible}
      onClose={onClose}
    >
      <div className="px-6 py-4">
        <div className="flex items-center">
          <img className="mr-2 h-6 w-6" src={TonIconSvg} alt="" />
          <span>TON</span>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <span>balance: </span>
          <span>{balanceStr}</span>
        </div>
        <div className="my-6 flex items-center justify-between">
          <span>amount: </span>
          <span>{amount}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button className="w-full rounded-full bg-[] bg-white py-3 text-black" onClick={onChangeWallet}>
            Change wallet
          </button>
          <button
            className="w-full rounded-full bg-[] bg-primary py-3 text-white disabled:bg-opacity-10 disabled:text-opacity-50"
            disabled={!canContinue}
            onClick={onContinue}
          >
            Continue
          </button>
        </div>
      </div>
    </Popup>
  )
}

function StakingAction(props: {
  pageDisabled: boolean
  onFinish: () => Promise<void>
  info?: Codatta.Ads.AdsStakeInfo
}) {
  const { pageDisabled, onFinish, info } = props

  const stakeTypeList = [
    { text: 'TON', value: StakeType.TON, icon: TonIconSvg },
    { text: 'Codatta points', value: StakeType.POINT, icon: codattaIcon },
  ]
  const [stakeItem, setStakeItem] = useState<Codatta.Ads.AdsStakeTypeItem>(stakeTypeList[0])
  const [showStakeType, setShowStakeType] = useState(false)
  const [userAvailablePoint, setUserAvailablePoint] = useState(0)
  const [inputAmount, setInputAmount] = useState<number>(0)
  const [stakingLoading, setStakingLoading] = useState(false)
  const [tonConnectUI] = useTonConnectUI()
  const [userAction, setUserAction] = useState<boolean>(false)
  const [walletInfo, setWalletInfo] = useState<ConnectedWallet | null>()
  const [showStakeConfirmPopup, setShowStakeConfirmPopup] = useState(false)
  const [balance, setBalance] = useState<bigint>()
  const [balanceStr, setBalanceStr] = useState<string>()
  const authStore = useAuthStore()
  const location = useLocation()
  const state = location.state || { retry: false }

  function handleStakeTypeSelect(item: { text: string; value: string; icon: string }) {
    if (item.value === StakeType.POINT && state.retry) return
    setStakeItem(item)
    setShowStakeType(false)
  }

  const canStake = useMemo(() => {
    if (!inputAmount) return false
    if (inputAmount <= 0) return false
    if (stakeItem.value === StakeType.TON_USDT) {
      if (inputAmount > 100) return false
    } else if (stakeItem.value === StakeType.TON) {
      if (inputAmount > 20) return false
    } else {
      if (inputAmount > userAvailablePoint) return false
    }
    return true
  }, [inputAmount, stakeItem.value])

  async function commitStaking(contractAddress: string, amount: number, comment: string) {
    setStakingLoading(true)

    const message = beginCell().storeUint(CONTRACT_OP.staking, 32).storeUint(0, 64)

    const stackTransaction: SendTransactionRequest = {
      validUntil: Math.floor(Date.now() / 1000) + 60,
      network: NETWORK,
      messages: [
        {
          address: contractAddress,
          amount: toNano(amount.toString()).toString(),
          payload: message.endCell().toBoc().toString('base64'),
        },
      ],
    }

    const response = await tonConnectUI.sendTransaction(stackTransaction, {})
    return response
  }

  async function tonCoinStaking() {
    setStakingLoading(true)
    try {
      const amount = inputAmount

      const contractAddress = info?.staking_contract_address!
      // const contractAddress = 'EQDegdoJ6xk0xRTf8T3T0_Lc7UAX4UHfSqn9r9pgqefHQcnK'

      const address = (walletInfo?.account.address ||
        (tonConnectUI.connected && tonConnectUI.account?.address)) as string
      console.log(
        address,
        toUserFriendlyAddress(address),
        `tonConnectUI.connected===${tonConnectUI.connected}`,
        tonConnectUI.account?.address,
      )
      if (!address) {
        Toast.fail('Please reconnect the wallet.')
        return
      }
      const comment = JSON.stringify({ uid: authStore.uid })
      const result = await commitStaking(contractAddress, amount, comment)
      const txHash = Cell.fromBase64(result.boc).hash().toString('hex')

      const res = await adsApi.saveStakingResult(amount, txHash, address)
      trackEvent('ADS_STAKE_HASHHEX', { contentType: 'stake', extra: { hashHex: txHash } })
      await onFinish()
    } catch (err: any) {
      console.log(err)
      Toast.fail(err!.message)
      trackEvent(TRACK_CATEGORY.ADS_STAKE_STAKE_ERROR, { contentType: err.message })
    }
    setStakingLoading(false)
  }

  async function handleTonConnect() {
    setShowStakeConfirmPopup(false)
    tonConnectUI.setConnectRequestParameters({ state: 'loading' })
    tonConnectUI.modal.open()
    const nonce = await authApi.getNonce()
    tonConnectUI.setConnectRequestParameters({ state: 'ready', value: { tonProof: nonce } })
    setStakingLoading(false)
  }

  async function handlePointStake() {
    setStakingLoading(true)
    try {
      const order = await adsApi.pointStaking(stakeItem.value, inputAmount)
    } catch (err: any) {
      Toast.fail(err!.message)
    }
    setStakingLoading(false)
  }

  async function handleStackClick() {
    if (stakeItem.value === 'POINT') {
      if (parseInt(inputAmount + '') !== parseFloat(inputAmount + '')) {
        Toast.fail('Codatta points must be integers')
        return
      }
      trackEvent(TRACK_CATEGORY.ADS_STAKE_STAKE_BTN_CLICK, { contentType: 'codatta points' })
      await handlePointStake()
      onFinish()
    } else if (tonConnectUI.connected) {
      trackEvent(TRACK_CATEGORY.ADS_STAKE_STAKE_BTN_CLICK, { contentType: 'usdt' })

      setShowStakeConfirmPopup(true)
    } else {
      setUserAction(true)
      handleTonConnect()
    }
  }

  async function handleSwitchWallet() {
    setShowStakeConfirmPopup(false)
    await tonConnectUI.disconnect()
    handleTonConnect()
  }

  async function getTonBalance(address: string) {
    try {
      const network = NETWORK === CHAIN.MAINNET ? 'mainnet' : 'testnet'
      const endpoint = await getHttpEndpoint({ network })
      const client = new TonClient({ endpoint })
      const balance = await client.getBalance(Address.parse(address!))
      const balanceStr = balance.toString()
      const readableBalance = balance / 10n ** 9n
      const readableBalanceStr = readableBalance.toString()
      const readableBalanceLen = readableBalanceStr.length

      if (balanceStr.length >= 10) {
        setBalanceStr(readableBalanceStr + '.' + balanceStr.slice(readableBalanceLen, readableBalanceLen + 2))
      } else {
        const fillBalanceStr = new Array(10 - balanceStr.length).fill(0).join('') + '' + balanceStr
        setBalanceStr(fillBalanceStr.slice(0, 1) + '.' + fillBalanceStr.slice(1, 3))
      }
      setBalance(readableBalance)
      return balance
    } catch (err) {
      // TODO getHttpEndpoint接口超时报错，点击continue 会无反应，可以重试
    }
  }

  useEffect(() => {
    if (walletInfo) {
      console.log('change=====', walletInfo)
      getTonBalance(walletInfo?.account.address)
    }
    if (!walletInfo && tonConnectUI.connected && tonConnectUI.account?.address) {
      getTonBalance(tonConnectUI.account?.address)
    }
    if (walletInfo && userAction) setShowStakeConfirmPopup(true)
  }, [walletInfo, userAction])

  useEffect(() => {
    return tonConnectUI.onStatusChange(setWalletInfo)
  }, [])

  useEffect(() => {
    if (!info) return
    const availablePoint = Math.min(info?.user_available_point, 2000)
    setUserAvailablePoint(availablePoint)
  }, [info])

  return (
    <div className="rounded-2xl border border-white border-opacity-15 bg-[#252532] p-4">
      <div className="mb-6">
        <h2 className="mb-1 text-lg font-bold">Staking</h2>
        <p className="text-sm text-gray-300">
          {stakeItem.value === StakeType.TON
            ? 'We offer 5% additional rewards, with an annualized return of 130%.'
            : 'You can stake up to 2000 points. We offer 100% additional rewards when you redeem your staking after 14 days. Alternatively, you can stake your USDT on the TON Network through Ton Wallet by clicking the arrow below. Please note: you only have one chance to stake, so choose carefully!'}
        </p>
      </div>

      <div className="mb-4">
        <label className="mb-2 block text-sm">Currency</label>
        <div
          className="flex items-center gap-2 rounded-xl border border-white border-opacity-10 bg-transparent p-3"
          onClick={() => setShowStakeType(true)}
        >
          <img src={stakeItem.icon} alt="" className="h-6 w-6 rounded-full" />
          <span className="text-sm">{stakeItem.text}</span>
          <ChevronRight className="ml-auto" />
        </div>
      </div>

      <div className="mb-6">
        <label className="mb-1 block text-sm">
          {stakeItem.value === StakeType.TON
            ? 'Stake Amount (20 Toncoin Max Allowed)'
            : 'Stake Amount (2000 Max Allowed)'}
        </label>
        {stakeItem.value === 'POINT' ? (
          <div className="mb-2 flex gap-2 text-[#808080]">
            <span>Your available points:</span>
            <span className="text-white">{userAvailablePoint}</span>
          </div>
        ) : (
          <></>
        )}
        <NumberInput
          disabled={pageDisabled}
          onChange={setInputAmount}
          placeholder="0.0"
          max={stakeItem.value === StakeType.POINT ? userAvailablePoint : null}
        />
      </div>

      <div>
        <button
          onClick={handleStackClick}
          disabled={pageDisabled || !canStake || stakingLoading}
          className="flex w-full justify-center rounded-full bg-[#D355FF] px-4 py-3 text-sm text-white disabled:bg-opacity-10 disabled:text-opacity-50"
        >
          {stakingLoading ? <Loader2 className="animate-spin" size={20}></Loader2> : 'Stake'}
        </button>
      </div>

      <StakingConfirmPopup
        visible={showStakeConfirmPopup}
        onChangeWallet={handleSwitchWallet}
        onContinue={tonCoinStaking}
        onClose={() => setShowStakeConfirmPopup(false)}
        amount={inputAmount}
        balance={balance}
        balanceStr={balanceStr}
      ></StakingConfirmPopup>

      <Popup
        className="rounded-t-3xl bg-[#252532] text-white"
        position="bottom"
        safeAreaInsetBottom
        visible={showStakeType}
        onClose={() => setShowStakeType(false)}
      >
        <div className="text-white">
          {stakeTypeList?.map((item) => {
            return (
              <SelectOption
                icon={item.icon}
                key={item.value}
                text={item.text}
                disabled={item.value === StakeType.POINT && state.retry === true}
                selected={stakeItem.value === item.value}
                onSelected={() => handleStakeTypeSelect(item)}
              ></SelectOption>
            )
          })}
        </div>
      </Popup>
    </div>
  )
}

const NumberInput = (props: {
  disabled: boolean
  max: number | null
  placeholder: string
  onChange?: (value: number) => void
}) => {
  const { disabled, onChange, placeholder, max } = props
  const [value, setValue] = useState('')

  const handleChange = (value: any) => {
    const inputValue = value
    const regex = /^[0-9]*\.?[0-9]*$/
    if (regex.test(inputValue)) {
      setValue(inputValue)
      onChange?.(parseFloat(inputValue))
    }
  }

  return (
    <div className="relative">
      {!!max && (
        <button
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-[#D8CAFF] px-2 py-[2px] text-sm text-[#301777]"
          onClick={() => handleChange(max)}
        >
          MAX
        </button>
      )}
      <input
        className="flex w-full items-center gap-2 rounded-xl border border-white border-opacity-10 bg-transparent p-3 text-xl font-bold placeholder:text-[#404049]"
        type="text"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => handleChange(e.target.value)}
      />
    </div>
  )
}

function SelectOption(props: {
  selected: boolean
  text: string
  icon: string
  disabled: boolean
  onSelected: () => void
}) {
  const { selected, text, disabled, onSelected, icon } = props
  return (
    <div
      className="flex items-center gap-2 border-b border-b-white border-opacity-10 px-6 py-4 text-sm last:border-b-0"
      style={{ filter: disabled ? 'opacity(0.5)' : 'none' }}
      onClick={() => onSelected()}
    >
      <img src={icon} className="h-6 w-6" alt="" />
      <span>{text}</span>
      <div
        className={cn(
          'ml-auto flex h-5 w-5 items-center justify-center rounded-full border border-white bg-transparent transition-all',
          selected || disabled ? 'bg-white' : '',
        )}
      >
        <Check size={12} className={cn('text-transparent', selected ? 'text-[#252532]' : '')}></Check>
      </div>
    </div>
  )
}

export function Component() {
  const navigate = useNavigate()
  const location = useLocation()
  const [pageDisabled, setPageDisabled] = useState<boolean>(false)
  const state = location.state

  const [stakingInfo, setStakingInfo] = useState<Codatta.Ads.AdsStakeInfo>()
  const [SafeSecuredInfo, setSafeSecuredInfo] = useState<{ guaranteeUrl: string; contractUrl: string }>({
    guaranteeUrl: '',
    contractUrl: '',
  })
  const [adsState, setAdsState] = useState<Codatta.Ads.AdsState | null>(null)

  async function handleStakingFinish() {
    if (adsState?.is_ads_play_finished) {
      navigate('/ads')
    } else {
      navigate('/ads/watch', { replace: true })
    }
  }

  async function getStakeAndStateInfo() {
    try {
      Toast.loading({ message: 'Loading...', duration: 0 })
      const res = await adsApi.consultStake()
      if (res.staking_order?.status === 'FINISHED' || res.staking_order?.status === 'PENDING_CONFIRM') {
        navigate('/ads/withdraw', { replace: true })
      }
      setSafeSecuredInfo({
        guaranteeUrl: res.guarantee_url,
        contractUrl: res.contract_exhibit_url,
      })
      setStakingInfo(res)
      const userState = await adsApi.getAdsState()
      setAdsState(userState)
      Toast.clear()
    } catch (err: any) {
      Toast.fail({ message: err.message })
    }
  }

  useEffect(() => {
    getStakeAndStateInfo()
  }, [])

  return (
    <>
      <PageHead title="Staking"></PageHead>
      <div className="flex h-full w-full flex-col gap-0 overflow-scroll bg-[#1c1c26]">
        {/* <div>
          <Switch size={24} checked={pageDisabled} onChange={(value) => setPageDisabled(value)} />
        </div> */}
        {/* {pageDisabled && (
          <div className="bg-[#F6CD43] p-3 text-xs leading-[18px] text-gray">
            Coming soon! Please check back later to participate. Exploring and earning corresponding rewards won't
            affect your eligibility to stake and win Toncoin.
          </div>
        )} */}

        <div className="p-4">
          <SafeSecured
            guaranteeUrl={SafeSecuredInfo?.guaranteeUrl}
            contractUrl={SafeSecuredInfo?.contractUrl}
          ></SafeSecured>
          <StakingAction pageDisabled={pageDisabled} onFinish={handleStakingFinish} info={stakingInfo}></StakingAction>
        </div>
      </div>
    </>
  )
}
