import { useMemo } from 'react'

import { useCountdown } from '@/hooks/use-count-down'

export default function TimePieBar({
  refreshTime,
  duration = 0,
  onTimeout,
}: {
  refreshTime: number // 单位s
  duration: number // 单位s
  onTimeout?: () => void
}) {
  const countdown = useCountdown((refreshTime + 2) * 1000, onTimeout)
  const countdownFormated = useMemo(() => {
    return countdown.asSeconds() < 1
      ? '0h 0m 0s'
      : countdown.asDays() >= 1
        ? countdown.format('D[d] H[h] m[m]')
        : countdown.format('H[h] m[m] s[s]')
  }, [countdown])
  const percent = useMemo(() => countdown.asSeconds() / duration, [countdown])

  return (
    <div className="relative h-[27px]">
      <svg width="90" height="27" viewBox="0 0 90 27" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M17.48 5.77982H16.94V6.31982V20.7198V21.2598H17.48H84.7136C86.4707 21.2598 87.9418 19.9284 88.1167 18.1801L88.9807 9.54013C89.182 7.52682 87.601 5.77982 85.5776 5.77982H17.48Z"
          fill="#2E2E37"
          stroke="white"
          strokeWidth="1.08"
        />
        <circle cx="13.16" cy="13.52" r="12.06" fill="#BDA6FF" stroke="white" strokeWidth="1.08" />
        <circle
          cx="13.16"
          cy="13.52"
          r="8"
          fill="none"
          stroke="#875DFF"
          strokeWidth="6"
          strokeDasharray={8 * Math.PI * 2}
          strokeDashoffset={8 * Math.PI * 2 * (1 - percent)}
          transform="rotate(-90, 13.16, 13.52)"
        />
        <circle cx="13.16" cy="13.5198" r="5.76" fill="#F3EEFF" />
      </svg>
      <div className="absolute left-6 top-0 box-border flex h-full w-16 items-center justify-center py-1 text-xs font-semibold">
        <span className="origin-center scale-[.8] whitespace-nowrap text-nowrap">{countdownFormated}</span>
      </div>
    </div>
  )
}
