import { proxy, snapshot, useSnapshot } from 'valtio'
import { useEffect } from 'react'

import { useLaunchParams } from '@/features/tg/hooks/use-launch-params'

interface TUser {
  firstName: string
  id: number
  languageCode: string
  lastName: string
  username: string
}

interface TTgStore {
  authDate: Date
  chatInstance: string
  chatType: string
  hash: string
  startParam: string
  user: TUser
  isTg: boolean
}

const tgStore = proxy<TTgStore>({
  authDate: new Date(),
  chatInstance: '',
  chatType: '',
  hash: '',
  startParam: '',
  user: {
    firstName: '',
    id: 0,
    languageCode: 'en',
    lastName: '',
    username: '',
  },
  isTg: false,
  // get isTg() {
  //   return !!this.user.id
  // },
})

export function useTgStoreInit() {
  console.log('useTgStoreInit')
  const { initData } = useLaunchParams()

  useEffect(() => {
    if (initData) {
      Object.keys(initData).forEach((key) => {
        if (key in tgStore && (tgStore as any)[key] !== (initData as any)[key]) {
          ;(tgStore as any)[key] = (initData as any)[key]
        }
      })
      tgStore.isTg = !!initData.user?.id
    }
  }, [initData])

  return [initData]
}

export function useTgStore() {
  return useSnapshot(tgStore)
}

/**
 * 非hook得方式获取tgStore快照
 * @returns
 */
export function getTgStore() {
  return snapshot(tgStore)
}
