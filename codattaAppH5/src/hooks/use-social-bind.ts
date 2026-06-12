import { useEffect, useState } from 'react'
import accountApi from '@/api/account.api'
import useWindowMonitor from './use-window-monitor'

import Toast from '@/utils/toast'

const useSocialBind = (onFinish?: () => void) => {
  const [loading, setLoading] = useState(false)
  const { openWindow, isWindowClosed, windowOpenError } = useWindowMonitor()

  useEffect(() => {
    if (windowOpenError) {
      Toast.fail(windowOpenError)
    }
  }, [windowOpenError])

  useEffect(() => {
    if (isWindowClosed) {
      console.log('window closed')
      onFinish?.()
    }
  }, [isWindowClosed])

  const handleSocialBind = async (socialType: 'Discord' | 'Telegram' | 'X', data?: any) => {
    setLoading(true)
    try {
      if (socialType === 'Telegram') {
        // const BOT_ID = import.meta.env.VITE_TG_BOT_ID
        // window.Telegram.Login.auth({ bot_id: BOT_ID, request_access: true }, (tgData) => {
        //   if (!tgData) throw new Error('Telegram authentication failed')
        //   return linkSocialAccount(channel, tgData)
        // })
      } else {
        const { link } = await accountApi.getSocialAccountLink(socialType)

        openWindow(link)
      }
    } catch (err: any) {
      Toast.fail(err.message)
    }

    setLoading(false)
  }

  return { handleSocialBind, loading }
}

export default useSocialBind
