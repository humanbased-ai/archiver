import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { TonConnectUIProvider } from '@tonconnect/ui-react'
import { ReactNode, useEffect, useMemo, useRef } from 'react'
import { userStoreActions } from '@/store/user.store'
import { authStoreActions } from '@/store/auth.store'
import { useAdsStore, adsStoreActions } from '@/store/ads.store'
import { useTrackPage } from '@/hooks/use-track'

function Setup() {
  const isLogin = authStoreActions.checkLogin()
  const location = useLocation()

  const redirectUrl = `/account/signin?redirect='${location.pathname}${location.search}`
  const navigateTo = `/account/signin?redirect=${encodeURIComponent(redirectUrl)}`
  if (!isLogin) return <Navigate to={navigateTo} />

  useEffect(() => {
    if (document.documentElement.scrollTop) document.documentElement.scrollTo(0, 0)
  }, [location])

  useEffect(() => {
    userStoreActions.getUserDetail()
  }, [])

  return <></>
}

export default function AdsLayout() {
  useTrackPage()

  return (
    <TonConnectUIProvider manifestUrl="https://static.codatta.io/static/tonconnect-manifest.json?ver=4">
      <Setup />
      <div className="flex h-[calc(100vh+1px)] flex-col overflow-y-auto overflow-x-hidden bg-[#1C1C26] text-white">
        <Outlet />
      </div>
    </TonConnectUIProvider>
  )
}
