import { proxy, useSnapshot } from 'valtio'

import adsApi from '@/api/ads.api'
import Toast from '@/utils/toast'

interface AdsStore {
  adsState: Codatta.Ads.AdsState
}

const adsStore = proxy<AdsStore>({
  adsState: {
    agreement_signed: false, // 是否已签署用户协议
    is_add_annotation: false, // 是否已添加用户标注
    is_staked: false, // 是否已质押
    is_ads_play_finished: false, // 是否已看完广告
    is_redemption: false, // 用户是否已发起赎回
    balance: 0
  },
})

export function useAdsStore() {
  return useSnapshot(adsStore)
}

async function getAdsState() {
  try {
    const res = await adsApi.getAdsState()
    adsStore.adsState = res
    return res
  } catch (e) {
    console.error(e)
    Toast.fail('Failed to get ads state')
    return false
  }
}

export const adsStoreActions = {
  getAdsState,
}
