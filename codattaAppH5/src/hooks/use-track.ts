import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

import { useAuthStore } from '@/store/auth.store'
import { setReactGAUserId, trackPageView } from '@/utils/ga'

export function useTrackPage() {
  // 如果切换账号，需要重新设置ga的uid
  const { uid } = useAuthStore()
  useEffect(() => {
    if (uid) {
      setReactGAUserId(uid)
    }
  }, [uid])

  //   监听页面变化，打点
  const { pathname } = useLocation()
  useEffect(() => {
    trackPageView()
  }, [pathname])
}
