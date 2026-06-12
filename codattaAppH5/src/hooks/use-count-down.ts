import dayjs from '@/utils/dayjs'
import { useCallback, useEffect, useRef, useState } from 'react'

export function useCountdown(endTime: string | number | dayjs.Dayjs, onTimeout?: () => void) {
  // 初始化结束时间为 UTC 格式
  const [endDate] = useState(() => dayjs.utc(endTime))

  // 计算当前时间到结束时间的倒计时
  const getCountdown = useCallback(() => {
    const now = dayjs.utc()
    return dayjs.duration(endDate.diff(now))
  }, [endDate])

  // 状态：倒计时时间和是否已触发超时
  const [countdown, setCountdown] = useState<plugin.Duration>(getCountdown())
  const timeouted = useRef<boolean>(false)

  useEffect(() => {
    // 定义一个递归的 setTimeout 函数
    function tick() {
      const currentCountdown = getCountdown()

      if (currentCountdown.asMilliseconds() <= 0) {
        if (!timeouted.current) {
          onTimeout?.()
          timeouted.current = true
        }
      } else {
        setCountdown(currentCountdown)
        setTimeout(tick, 1000) // 调用自身以继续倒计时
      }
    }

    // 启动倒计时
    const timerId = setTimeout(tick, 1000)

    // 清理函数
    return () => clearTimeout(timerId)
  }, [getCountdown, onTimeout, timeouted])

  return countdown
}
