import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { useTonConnectModal, useTonConnectUI } from '@tonconnect/ui-react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { GradientButton } from '@/components/ui/button'
import logoImg from '@/assets/icons/logo-light.png'
import userApi from '@/api/user.api'
import authApi from '@/api/auth.api'
import { authStoreActions } from '@/store/auth.store'
import Toast from '@/utils/toast'

export const Component = () => {
  const { code } = useParams()
  const [query] = useSearchParams()
  const redirect = query.get('redirect') || '/'
  const [username, setUsername] = useState('')
  const tonConnectModal = useTonConnectModal()
  const [tonConnectUI] = useTonConnectUI()
  const navigate = useNavigate()

  const isLogin = authStoreActions.checkLogin()
  if (isLogin) {
    return <Navigate to={redirect} />
  }

  const handleLoginClick = async () => {
    tonConnectUI.setConnectRequestParameters({ state: 'loading' })
    const nonce = await authApi.getNonce()
    tonConnectUI.setConnectRequestParameters({ state: 'ready', value: { tonProof: nonce } })
    openTonConnectModal()
  }

  function openTonConnectModal() {
    tonConnectUI.disconnect()
    tonConnectModal.open()
  }

  const getUsername = async () => {
    const res = await userApi.getCodeUsername(code!)
    setUsername(res)
  }

  async function handleLogin(walletInfo: any) {
    try {
      authStoreActions.setReferralCode(code!)
      await authStoreActions.tonLogin(walletInfo)
      if (redirect) navigate(redirect)
      else navigate(redirect)
    } catch (err: any) {
      Toast.fail(err.message || 'Exception occurred! please try again.')
    }
  }

  useEffect(() => {
    if (!code) navigate(redirect)
    else getUsername()
    const unsubscriber = tonConnectUI.onStatusChange((walletInfo) => {
      if (!walletInfo) return
      if (!walletInfo.account) return
      handleLogin(walletInfo)
    })
    return unsubscriber
  }, [code])

  return (
    <div className="flex min-h-screen flex-col px-5 pb-4 pt-[50%] text-center text-white">
      <div>
        <img src={logoImg} alt="" className="mx-auto mb-6 h-14" />
        <h3 className="font-700 mb-2 text-3xl">Welcome to codatta! </h3>
        <div className="mb-6 text-base text-gray-500">
          {username ? <strong>{username}</strong> : 'Your friend'} invites you to explore codatta, world's leading
          AI-powered collaboration protocol for blockchain metadata.
        </div>
        <div className="mt-64px flex justify-center">
          <GradientButton
            className="px-40px font-600 py-12px flex w-40 items-center justify-center rounded-full py-2 text-sm"
            onClick={() => handleLoginClick()}
          >
            <span>Sign up</span>
            <ArrowRight className="animate-pause" />
          </GradientButton>
        </div>
      </div>
    </div>
  )
}

export default Component
