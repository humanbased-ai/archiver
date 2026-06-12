import { proxy, useSnapshot } from 'valtio'

import userApi from '@/api/user.api'
import dayjs from 'dayjs'

type IReferralStore = {
  page: number
  total_count: number
  total_reward: number
  recordMap: { [page: number]: (Codatta.User.InviteRecordItem & { formateDate?: string })[] }
  records: (Codatta.User.InviteRecordItem & { formateDate?: string })[]
  loading: boolean
  hasMore: boolean
}

const referralStore = proxy<IReferralStore>({
  page: 1,
  total_count: 0,
  total_reward: 0,
  loading: false,
  hasMore: false,
  recordMap: {},
  records: [],
})

const page_size = 10
async function loadReferralRecords(page = 1) {
  try {
    referralStore.loading = true
    const data = await userApi.getInviteRecords({ page, page_size })

    referralStore.recordMap[page] = data.result?.map((record) => {
      return { ...record, formateDate: dayjs(record.date).format('YYYY-MM-DD') }
    })
    referralStore.total_count = data.total_count ?? 0
    referralStore.total_reward = data.total_reward ?? 0
    referralStore.hasMore = referralStore.records.length < referralStore.total_count

    const records = Object.keys(referralStore.recordMap)
      .map(Number)
      .reduce((acc, key) => acc.concat(referralStore.recordMap[key]), [] as Codatta.User.InviteRecordItem[])
    if (JSON.stringify(referralStore.records) !== JSON.stringify(records)) {
      referralStore.records = records
    }

    console.log('referralStore', referralStore.recordMap, referralStore.records)
  } catch (e: any) {
    console.error('getReferralRecords', e.message)
  }
  referralStore.loading = false
}

export async function loadInitReferralRecords() {
  if (!referralStore.recordMap[1]) {
    await loadReferralRecords(1)
  }
}

export async function loadMoreReferralRecords() {
  console.log('getMoreReferralRecords')
  if (referralStore.hasMore && !referralStore.loading) {
    await loadReferralRecords(++referralStore.page)
  }
}

export function useReferralStore() {
  return useSnapshot(referralStore)
}
