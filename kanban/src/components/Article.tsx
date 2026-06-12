import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { useSnapshot } from 'valtio'

import useTimer from '../hooks/useTimer'
import { getDashboardData, dashboardStore } from '../stores/dashboard.store'
import Number from './Num'

const getDiffTime = (lastTime: number): string => {
  const duration = dayjs().diff(lastTime) / 1000 / 60
  const hours = Math.floor(duration / 60)
  const minutes = Math.floor(duration - hours * 60)
  return `${hours}h ${minutes}m`
}
const Time = ({ time }: { time: string }) => {
  const [timeStr, setTimeStr] = useState('0h 0m')

  useEffect(() => {
    const t = +new Date(time)
    console.log('time ', new Date(time))
    const diffTime = getDiffTime(t > +new Date() ? +new Date() : t)
    setTimeStr(diffTime)
  }, [time])

  return <span className="text-nowrap">Updated {timeStr} ago</span>
}

const Card = ({
  num,
  ydayNum,
  mau,
  title,
  subTitle,
  time,
  hasFlag = true
}: {
  num: number
  title: string
  subTitle?: string
  ydayNum: number
  mau?: number
  hasFlag?: boolean
  time: string
}) => {
  console.log('time', time)
  return (
    <div className="rounded-lg border border-solid border-[#D1DBE8] p-6 min-w-[300px] box-border text-center">
      <h3 className="text-[#0D141C] text-lg font-medium">{title}</h3>
      {subTitle && <h4 className="text-[#0D141C] text-base">({subTitle})</h4>}

      <Number num={num} className="text-[#0D141C] font-bold text-4xl py-3" />

      <div className="text-[#0D141C] text-base">
        {
          mau ? <><span className="text-[#088738]">{mau}</span> (mau)</>: <><span className="text-[#088738]">{hasFlag ? (ydayNum > 0 ? `+${ydayNum}` : ydayNum)  : ydayNum}</span> (yesterday)</>
        }
        
      </div>
      <div className="mt-3 text-[#4F7396] text-sm">
        <Time time={time} />
      </div>
    </div>
  )
}

const Article = () => {
  const { time } = useTimer(60 * 30 * 1000)
  const store = useSnapshot(dashboardStore)

  useEffect(() => {
    getDashboardData()
  }, [time])

  return (
    <div className="mt-10">
      <div className="grid grid-cols-3 gap-4 mb-4 px-4">
        <Card title="Daily Active Users" num={store.dau} ydayNum={store.last_dau} hasFlag={false} mau={store.mau} time={store.update_time}></Card>
        <Card title="Total Signup Accounts" num={store.total_sign_up} ydayNum={store.last_day_new_signup} time={store.update_time}></Card>
        <Card title="Total Submission" num={store.total_submission} ydayNum={store.last_day_submission} time={store.update_time}></Card>
      </div>
    </div>
  )
}

export default Article
