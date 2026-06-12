import { useState, useEffect, useCallback, useRef } from 'react'

function useWindowMonitor() {
  const windowRef = useRef<Window | null>(null)
  const [isWindowClosed, setIsWindowClosed] = useState(false)
  const [error, setError] = useState('')

  const openWindow = useCallback((url: string) => {
    // 计算移动设备上的窗口宽高
    const screenWidth = window.screen.width
    const screenHeight = window.screen.height
    const popupWidth = screenWidth * 0.8
    const popupHeight = screenHeight * 0.8
    const left = (screenWidth - popupWidth) / 2
    const top = (screenHeight - popupHeight) / 2

    // 打开新窗口
    const newWindow = window.open(url, '_blank', `width=${popupWidth},height=${popupHeight},left=${left},top=${top}`)

    if (newWindow) {
      windowRef.current = newWindow
      setIsWindowClosed(false)
      console.log('New window opened', newWindow, newWindow.closed)
    } else {
      setError('Failed to open new window')
    }
  }, [])

  useEffect(() => {
    if (!windowRef.current) return

    let timer: NodeJS.Timeout
    const checkWindowClosed = () => {
      if (windowRef.current?.closed) {
        setIsWindowClosed(true)
      } else {
        timer = setTimeout(checkWindowClosed, 400)
      }
    }

    checkWindowClosed()

    // 清理窗口引用
    return () => {
      clearTimeout(timer)
      windowRef.current?.close()
      windowRef.current = null
    }
  }, [windowRef.current]) // Only run when the window reference changes

  return { openWindow, isWindowClosed, windowOpenError: error }
}

export default useWindowMonitor
