import { useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { cn } from '@udecode/cn'

import Icon from '@/components/ui/svg-icon'
import { trackEvent, TRACK_CATEGORY } from '@/utils/ga'

export default function NavMenu() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [currenPath, setCurrentPath] = useState('/')

  useEffect(() => {
    if (pathname == currenPath) return

    const [_, path = '/'] = pathname.split('/')

    if (['quest', 'referral', 'ads'].includes(path)) {
      setCurrentPath(`/${path}`)
    } else if (currenPath !== '' && currenPath !== '/') {
      setCurrentPath('/')
    }
  }, [pathname])

  const menu: { text: string; icon: React.ReactNode; router: string }[] = [
    {
      text: 'Home',
      icon: <Icon name="home" className="h-5 w-5" />,
      router: '/',
    },
    {
      text: 'Quest',
      icon: <Icon name="watch" className="h-5 w-5" />,
      router: '/quest',
    },
    {
      text: 'Referral',
      icon: <Icon name="arrow-export" className="h-5 w-5" />,
      router: '/referral',
    },
    // {
    //   text: 'Vault',
    //   icon: <Icon name="cursor" className="h-5 w-5" />,
    //   router: '/ads',
    // },
  ]

  function onClickTab(router: string) {
    switch (router) {
      case '/quest':
        trackEvent(TRACK_CATEGORY.PAGE_MENU_CLICK, { contentType: 'quest', extra: { tab: 'quest' } })
        break
      case '/referral':
        trackEvent(TRACK_CATEGORY.PAGE_MENU_CLICK, { contentType: 'referral', extra: { tab: 'referral' } })
        break
      case '/ads':
        trackEvent(TRACK_CATEGORY.PAGE_MENU_CLICK, { contentType: 'ads', extra: { tab: 'ads' } })
        break
      default:
        trackEvent(TRACK_CATEGORY.PAGE_MENU_CLICK, { contentType: 'home', extra: { tab: 'home' } })
        break
    }
    navigate(router)
  }

  return (
    <ul className="flex h-[66px] items-center justify-around border-t-[1px] border-solid border-t-[#FFFFFF1F] bg-gray-900 text-sm text-gray-600">
      {menu.map((item) => (
        <li
          key={item.router}
          className={cn('flex flex-col items-center justify-center', currenPath === item.router ? 'text-white' : '')}
          onClick={() => onClickTab(item.router)}
        >
          {item.icon}
          <span className="text-sm">{item.text}</span>
        </li>
      ))}
    </ul>
  )
}
