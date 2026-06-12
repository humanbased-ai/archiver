import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import useTimer from '../hooks/useTimer'

function formateNow(): string {
  return dayjs(Date.now()).format('YYYY-MMM-DD [UTC Time:] HH:mm:ss')
}
const Time = () => {
  const { time } = useTimer()
  const [now, setNow] = useState('')

  useEffect(() => {
    setNow(formateNow())
  }, [time])

  return <div className="text-xs mt-3 text-[#4F7396]">{now}</div>
}
const Head = () => {
  return (
    <div className="text-center pb-4">
      <h1 className="text-[#0D141C] text-2xl font-semibold">codatta Platform Statistics</h1>
      <Time />
    </div>
  )
}

export default Head
