import { proxy, useSnapshot } from 'valtio'

import taskApi from '@/api/task.api'
import homeApi from '@/api/home.api'


export interface HomeStore {
  // contribution: number
  // reputation: number
  total_ticker_count: number
  is_check_in: boolean
}

const homeStore = proxy<HomeStore>({
  // contribution: 0,
  // reputation: 0,
  total_ticker_count: 0,
  is_check_in: false,
})

export function useHomePageStore() {
  return useSnapshot(homeStore)
}

async function getHomePageInfo() {
  try {
    const data = await homeApi.getInfo()

    // homeStore.contribution = data.account_info.contribution || 0
    // homeStore.reputation = data.account_info.reputation || 0
    homeStore.total_ticker_count = data.account_info.total_ticker_count || 0
    homeStore.is_check_in = data.check_in_info.is_check_in || false
    return data
  } catch (e: any) {
    console.error('getHomePageInfo', e?.message)
  }
}

export async function getCheckinInfo() {
  try {
    const data = await taskApi.getCheckinInfo()
    return data
  } catch (e: any) {
    console.error('getCheckinInfo', e?.message)
  }
}

export async function checkin() {
  try {
    const res = await taskApi.checkin()
    // homeStore.is_check_in = true
    // homeStore.is_check_in = res.is_check_in || false
    // homeStore.ticker_count = res.ticker_count || 0
    // homeStore.checkin.is_check_in = res.is_check_in || false
    // homeStore.checkin.check_in_days = res.check_in_days || 0
    // homeStore.checkin.reward_value = res.reward_value || 0
    return res
  } catch (e) {
    console.error('checkin', e)
    return {
      check_in_days: 0,
      reward_value: 0,
      issue_ticker_count: 0,
    }
  }
}

export const homePageStoreActions = {
  getHomePageInfo,
  getCheckinInfo,
  checkin,
}
