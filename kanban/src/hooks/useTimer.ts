import { useState, useEffect, useRef } from 'react'

/**
 * @param gap 时间间隔
 * @returns 
 */
const useTimer = (gap: number = 1000) => {
  const timer = useRef<any>(null)
  const [time, setTime] = useState(0)

  useEffect(() => {
    timer.current = setTimeout(() => {
      setTime(time + 1)
    }, gap)

    return () => clearTimeout(timer.current)
  }, [time])

  return { time }
}

export default useTimer
