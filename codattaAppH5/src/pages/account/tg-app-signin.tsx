import { ConnectedWallet, useTonConnectUI } from '@tonconnect/ui-react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'

import LogoImage from '@/assets/icons/logo-light.png'
import TonIconSvg from '@/assets/icons/svg/ton.svg'
import BiggetWalletImage from '@/assets/icons/bitget-wallet.png'
import OkxLogoImage from '@/assets/images/common/okx-wallet.png'

import { authStoreActions } from '@/store/auth.store'
import authApi from '@/api/auth.api'
import ToastTool from '@/utils/toast'
import { Popup, Toast } from 'react-vant'
import { cn } from '@udecode/cn'
import { Loader2 } from 'lucide-react'
import Spliter from '@/components/ui/spliter'
import { GradientButton } from '@/components/ui/button'
import { Wallet } from '@okxconnect/ui'
import { useOkxConnectUI } from '@/components/provider/okx-connect-context-provider'

export function Component() {
  const navigate = useNavigate()
  const [query] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')

  const [showEmailCaptcha, setShowEmailCaptcha] = useState(false)
  const [captchaImage, setCaptchaImage] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [captchaLoading, setCaptchaLoading] = useState(false)
  const [sendEmailLoading, setSendEmailLoading] = useState(false)
  const [captchaCode, setCaptchaCode] = useState('')
  const [captchaError, setCaptchaError] = useState('')
  const [nonce, setNonce] = useState('')

  const [tonConnectUI] = useTonConnectUI()
  const okxTonConnectUI = useOkxConnectUI()
  const redirectUrl = query.get('redirect') || '/'
  const isLogin = authStoreActions.checkLogin()

  const [userAction, setUserAction] = useState(false)

  const isEmail = useMemo(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }, [email])

  async function handleEmailLogin() {
    navigate('/account/signin/email', { state: { email } })
  }

  async function handleGetEmailCode() {
    setSendEmailLoading(true)
    try {
      setCaptchaError('')
      const res = await authApi.getEmailCode(email, captchaCode)
      navigate('/account/signin/email', { state: { email } })
    } catch (err: any) {
      setCaptchaError(err?.message)
      getEmailCaptcha()
      setSendEmailLoading(false)
    }
  }

  async function tonDisconnect() {
    try {
      // await tonConnectUI.connectionRestored
      await tonConnectUI.disconnect()
      console.log(tonConnectUI.connected, 2)
    } catch (err: any) {
      console.log(tonConnectUI.connected, 3)
      console.log(err.message)
    }
  }

  function openTonConnectModal() {
    setUserAction(true)
    tonConnectUI.modal.open()
  }

  /**
   * 请注意，该方法需要为同步的方法，不能是异步的
   * 需要保证用户点击后唤起open，才能做到在ios中点后后出现唤起钱包的提示。
   */
  async function openOkxTonWallet() {
    okxTonConnectUI.setConnectRequestParameters({
      state: 'ready',
      value: { tonProof: nonce },
    })
    okxTonConnectUI.openModal()
  }

  async function openBitgetWallet() {
    setUserAction(true)
    tonConnectUI.openSingleWalletModal('bitgetTonWallet')
  }

  async function getEmailCaptcha() {
    setCaptchaLoading(true)
    try {
      const imageData = await authApi.getEmailCaptcha()
      setCaptchaImage(imageData)
    } catch (err: any) {
      console.log(err.message)
    }
    setCaptchaLoading(false)
  }

  async function handleTonLogin(walletInfo: any) {
    Toast.loading('loading...')
    try {
      if (walletInfo.device.appName === 'OKX Wallet') {
        walletInfo.device.appName = 'okxTonWallet'
      }
      await authStoreActions.tonLogin(walletInfo)
      navigate(redirectUrl)
    } catch (err: any) {
      tonDisconnect()
      ToastTool.fail(err.message || 'Exception occurred! please try again.')
    }
    Toast.clear()
  }

  async function pageInit() {
    setLoading(true)
    await tonDisconnect()
    tonConnectUI.setConnectRequestParameters({ state: 'loading' })
    const nonce = await authApi.getNonce()
    tonConnectUI.setConnectRequestParameters({ state: 'ready', value: { tonProof: nonce } })
    setNonce(nonce)
    setLoading(false)
  }

  function handleStateChange(walletInfo: ConnectedWallet | null | Wallet) {
    if (!walletInfo) return
    if (!walletInfo.account) return
    if (!walletInfo.connectItems?.tonProof) return
    handleTonLogin(walletInfo)
  }

  useEffect(() => {
    pageInit()
    const unsubscriber = tonConnectUI.onStatusChange(handleStateChange)
    return unsubscriber
  }, [])

  useEffect(() => {
    const unsubscriber = okxTonConnectUI.onStatusChange(handleStateChange)
    return unsubscriber
  }, [])

  useEffect(() => {
    // 这里是为了确保在登录页面，tonconnect需要断联。
    // 页面初始化的时间可能快于tonconnect的restore，当tonconnect restore完成后，会把状态置为connect。该顺序会滞后于页面的初始化节点。
    if (!userAction && tonConnectUI.connected) {
      tonDisconnect()
    }
  }, [tonConnectUI.connected])

  if (isLogin) {
    return <Navigate to={redirectUrl} />
  }

  return (
    <div className="mx-auto max-w-[375px] px-6 pt-[60px] text-center text-white">
      <div className="pb-12">
        <img src={LogoImage} alt="codatta logo " className="mx-auto mb-4 block h-14" />
        <h1 className="mb-2 text-xl font-bold">Welcome to Codatta!</h1>
        <p className="text-base text-gray-300">
          Codatta is a universal annotation and labeling platform that turns your intelligence into AI.
        </p>
      </div>
      <div>
        <input
          placeholder="Enter your email"
          className="mb-4 block w-full rounded-lg border border-gray-700 bg-gray-800 text-sm leading-6"
          type="email"
          onChange={(e) => setEmail(e.target.value)}
        />
        <GradientButton
          disabled={!isEmail}
          onClick={handleEmailLogin}
          className={cn(
            'mx-auto flex w-full items-center justify-center gap-2 py-2 transition-all',
            'rounded-full text-sm font-medium leading-6',
            'disabled:border-gray-700 disabled:bg-gray-700 disabled:text-gray-400',
          )}
        >
          {emailLoading ? <Loader2 className="animate-spin" size={24} /> : 'Continue'}
        </GradientButton>
        <Spliter className="my-8">
          <span className="text-sm text-gray-500">OR</span>
        </Spliter>

        <div className="flex flex-col gap-3 text-sm">
          <button
            className="mx-auto flex w-full items-center justify-center gap-2 rounded-full bg-gray-800 py-3 font-medium text-white"
            onClick={openOkxTonWallet}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <>
                <img src={OkxLogoImage} className="rounde-sm h-6 w-6" />
                OKX Wallet
              </>
            )}
          </button>
          <button
            className="mx-auto flex w-full items-center justify-center gap-2 rounded-full bg-gray-800 py-3 font-medium text-white"
            onClick={openBitgetWallet}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <>
                <img src={BiggetWalletImage} className="rounded-full h-6 w-6" />
                Bitget Wallet
              </>
            )}
          </button>
          <button
            className="mx-auto flex w-full items-center justify-center gap-2 rounded-full bg-gray-800 py-3 font-medium text-white"
            onClick={openTonConnectModal}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <>
                <img src={TonIconSvg} className="rounde-sm h-6 w-6" />
                TON CONNECT
              </>
            )}
          </button>
        </div>
      </div>
      <Popup
        className={cn('absolute rounded-lg bg-gray-800 p-4 text-white transition-all')}
        visible={showEmailCaptcha}
        onClose={() => setShowEmailCaptcha(false)}
      >
        <div className="flex flex-col gap-4">
          <h1>Input Email Captcha</h1>
          {captchaLoading ? (
            <div className="flex aspect-[12/5] w-full items-center justify-center rounded-lg">
              <Loader2 className="animate-spin" size={24} />
            </div>
          ) : (
            <img src={captchaImage} className="aspect-[12/5] w-full rounded-lg" alt="" onClick={getEmailCaptcha} />
          )}
          <div>
            <input
              placeholder="Enter captcha"
              className="mb-1 block w-full rounded-lg border border-gray-700 bg-gray-800 text-sm leading-6"
              onChange={(e) => setCaptchaCode(e.target.value)}
            />
            <div className={cn('text-sm text-red-500 transition-all', captchaError ? 'h-[1.5em]' : 'h-0')}>
              {captchaError}
            </div>
          </div>
          <GradientButton
            disabled={sendEmailLoading}
            className="flex items-center justify-center"
            onClick={handleGetEmailCode}
          >
            {sendEmailLoading ? <Loader2 className="animate-spin" size={24} /> : 'Continue'}
          </GradientButton>
        </div>
      </Popup>
    </div>
  )
}
