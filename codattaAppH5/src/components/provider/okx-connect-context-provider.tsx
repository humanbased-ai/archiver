import { OKXTonConnectUI, THEME } from "@okxconnect/ui"
import React, { useEffect, useState } from "react"

const uiObject = new OKXTonConnectUI({
  dappMetaData: {
    name: 'Codatta',
    icon: 'https://static.codatta.io/static/logos/codatta_blackbg_white.svg',
  },
  actionsConfiguration:{
    returnStrategy:'none',
    tmaReturnUrl:'back'
  },
  uiPreferences: {
    theme: THEME.LIGHT
  },
  language: 'en_US',
  restoreConnection: true
})

type OkxConnectContext = {
  okxTonConnectUI: OKXTonConnectUI 
}

const CountContext = React.createContext<OkxConnectContext>({
  okxTonConnectUI: uiObject
})

export function useOkxConnectUI() {
  const context = React.useContext(CountContext)
  return context.okxTonConnectUI
}

export function OkxTonConnectContextProvider(props: { children: React.ReactNode }) {
  const { children } = props
  const [okxTonConnectUI] = useState<OKXTonConnectUI>(uiObject)

  // 3. 在 Provider 组件中提供状态和更新方法
  return (
    <CountContext.Provider value={{ okxTonConnectUI }}>
      {children}
    </CountContext.Provider>
  );
}