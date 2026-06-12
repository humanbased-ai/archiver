import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { useEffect } from 'react'

import { SDKProvider } from '@/features/tg/context/sdk-provider'

import { useVhPolyfill } from '@/hooks/use-vh-polyfill'
import { useWindowScrollPolyfill } from '@/hooks/use-window-scroll-polyfill'
import { useInitMiniApp } from '@/features/tg/hooks/use-init-app'

import { useTgStoreInit } from '@/store/tg.store'
import { initGA } from './utils/ga'

import { router } from '@/router'

import { ConfigProvider } from 'react-vant'
import enUS from 'react-vant/es/locale/lang/en-US'
import cookies from 'js-cookie'
import '@/styles/index.scss'

import Buffer from 'buffer'
window.Buffer = Buffer.Buffer

const container = document.getElementById('root') as HTMLDivElement
const root = createRoot(container)

initGA()

function Setup() {
  // 小程序设置
  const [miniApp] = useInitMiniApp()

  useVhPolyfill()
  useWindowScrollPolyfill()
  useTgStoreInit()

  useEffect(() => {
    miniApp?.setHeaderColor('#000000')
    miniApp?.setBgColor('#000000')
  }, [miniApp])

  return <></>
}

root.render(
  <ConfigProvider locale={enUS}>
  <SDKProvider acceptCustomStyles debug={true}>
    <Setup />
    <RouterProvider router={router} />
  </SDKProvider>
  </ConfigProvider>
)
