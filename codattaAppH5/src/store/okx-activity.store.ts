// 只是okx活动的store，后续可能会删除，尽量不要在这里增加逻辑。

import { proxy, useSnapshot } from "valtio"
import OkxActivityApi from "@/api/okx-activity.api"

interface OkxActivityStore {
  showCheckIn: number,
  showOkxTonConnect: number,

  campaignInfo: {
    check_in: boolean,
    staking: boolean,
    ads_quest: boolean,
    claim_receive: boolean
  }
}

const okxActivityStore = proxy<OkxActivityStore>({
  showCheckIn: 0,
  showOkxTonConnect: 0,
  campaignInfo: {
    check_in: false,
    staking: false,
    ads_quest: false,
    claim_receive: false
  }
})

export function useOkxActivityStore() {
  return useSnapshot(okxActivityStore)
}

function showCheckInModal() {
  okxActivityStore.showCheckIn += 1
}

function showConnectModal() {
  okxActivityStore.showOkxTonConnect += 1
}

async function getCampaignInfo() {
  const res = await OkxActivityApi.getCampaignInfo()
  okxActivityStore.campaignInfo = res
  return res
}

async function claimReward() {
  const res = await OkxActivityApi.claimReward()
  return res
}

async function resetStore() {
  okxActivityStore.showCheckIn = 0
  okxActivityStore.showOkxTonConnect = 0
}

export const okxActivityStoreActions = {
  showCheckInModal,
  showConnectModal,
  getCampaignInfo,
  claimReward,
  resetStore
}