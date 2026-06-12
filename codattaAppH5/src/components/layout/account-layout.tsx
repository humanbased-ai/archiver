import { Outlet } from 'react-router-dom'
import { TonConnectUIProvider } from '@tonconnect/ui-react'
import { useTrackPage } from '@/hooks/use-track'
import { OkxTonConnectContextProvider } from '../provider/okx-connect-context-provider'

export default function AccountLayout() {
  useTrackPage()

  return (
    <TonConnectUIProvider manifestUrl="https://static.codatta.io/static/tonconnect-manifest.json?ver=4">
      <OkxTonConnectContextProvider>
        <div className="flex h-[calc(100vh+1px)] flex-col overflow-y-auto overflow-x-hidden text-white">
          <Outlet />
        </div>
      </OkxTonConnectContextProvider>
    </TonConnectUIProvider>
  )
}
