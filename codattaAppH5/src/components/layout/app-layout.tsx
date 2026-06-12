import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { TonConnectUIProvider } from '@tonconnect/ui-react'
import { useEffect } from 'react'
import { userStoreActions } from '@/store/user.store'
import { authStoreActions } from '@/store/auth.store'
import { useTrackPage } from '@/hooks/use-track'
import NavMenu from '@/components/page/nav-menu'

function Setup() {
  const { pathname } = useLocation()

  useEffect(() => {
    userStoreActions.getUserDetail()
  }, [])

  useEffect(() => {
    if (document.documentElement.scrollTop) document.documentElement.scrollTo(0, 0)
    console.log('pathname', pathname)
  }, [pathname])

  return <></>
}

export default function AppLayout({ navMenuVisibile = true }: { navMenuVisibile?: boolean }) {
  useTrackPage()

  const isLogin = authStoreActions.checkLogin()
  const { pathname } = useLocation()

  // console.log('isLogin', pathname)
  if (!isLogin) {
    if (pathname === '/' || pathname === '/app/account/signin') {
      return <Navigate to={`/account/signin`} />
    }

    return <Navigate to={`/account/signin?redirect=${pathname}`} />
  }

  return (
    <TonConnectUIProvider manifestUrl="https://static.codatta.io/static/tonconnect-manifest.json?ver=4">
      <Setup />
      <div className="flex h-[calc(100vh+1px)] flex-col overflow-y-auto overflow-x-hidden text-white">
        <div className="flex-1 overflow-x-hidden">
          <Outlet />
        </div>
        {navMenuVisibile && <NavMenu />}
      </div>
    </TonConnectUIProvider>
  )
}
