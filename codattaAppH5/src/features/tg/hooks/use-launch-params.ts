import { useEffect, useState } from 'react'
import { type LaunchParams, retrieveLaunchParams } from '@telegram-apps/sdk'

import { urlSafeEncode } from '@/utils/schema'
import { safeExecute } from '@/utils/try-catch'
import { VITE_IS_DEV_MODE } from '@/config'

export function useLaunchParams(): LaunchParams {
  const [inited, setInited] = useState<boolean>(false)
  const [params, setParams] = useState<LaunchParams>({} as LaunchParams)

  useEffect(() => {
    if (inited) return

    safeExecute(() => {
      console.log('useLaunchParams useEffect')
      console.log(VITE_IS_DEV_MODE)
      const params = VITE_IS_DEV_MODE ? devLaunchParams() : retrieveLaunchParams()
      console.log('useLaunchParams useEffect params', params)

      setParams(params)
      setInited(true)
    })
  }, [])

  return params
}

/**
 * 本地开发调试时，模拟小程序的传参，一般只需要改
 * @returns
 */
function devLaunchParams(): LaunchParams {
  const schema = 'app://'

  return {
    initData: {
      authDate: new Date(),
      chatInstance: '6742804130563490083',
      chatType: 'private',
      hash: '6371e2caf81cb20bdb9e6a5697591461c27a5d4136b68197529bec29ac413924', // 防伪hash
      startParam: urlSafeEncode(schema),
      user: {
        allowsWriteToPm: true,
        firstName: 'Mackey',
        id: 6868088893,
        languageCode: 'en',
        lastName: '',
        username: 'Yaya_007ma',
      },
    },
    initDataRaw:
      'user=%7B%22id%22%3A6868088893%2C%22first_name%22%3A%22Mackey%22%2C%22last_name%22%3A%22%22%2C%22username%22%3A%22Yaya_007ma%22%2C%22language_code%22%3A%22en%22%2C%22allows_write_to_pm%22%3Atrue%7D&chat_instance=6742804130563490083&chat_type=private&start_param=YXBwOi8vYWNjb3VudC9yZWZlcnJhbC9wMTYzMThG&auth_date=1720592423&hash=6371e2caf81cb20bdb9e6a5697591461c27a5d4136b68197529bec29ac413924',
    platform: 'weba',
    startParam: urlSafeEncode(schema),
    themeParams: {
      bgColor: '#212121',
      textColor: '#ffffff',
      hintColor: '#aaaaaa',
      linkColor: '#8774e1',
      buttonColor: '#8774e1',
      buttonTextColor: '#ffffff',
      secondaryBgColor: '#0f0f0f',
      headerBgColor: '#212121',
      accentTextColor: '#8774e1',
      sectionBgColor: '#212121',
      sectionHeaderTextColor: '#aaaaaa',
      subtitleTextColor: '#aaaaaa',
      destructiveTextColor: '#e53935',
    },
    version: '7.4',
  }
}
