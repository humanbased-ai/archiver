import { proxy, snapshot, useSnapshot } from 'valtio'

import userApi, { TUserInfo, TUserUpdateParams } from '@/api-v2/user.api'
import { derive } from 'derive-valtio'
import { ShortenAddress } from '@/utils/wallet-address'
import { toUserFriendlyAddress } from '@tonconnect/ui-react'

export interface UserStore {
  info: TUserInfo
  accounts: TUserInfo['accounts_data']
  // social_account_info: Codatta.User.SocialAccountInfo[]
}

export const userStore: UserStore = proxy<UserStore>({
  info: {
    user_reputation: 0,
    user_data: {
      avatar: '',
      referee_code: '',
      user_id: '',
      user_name: '',
    },
    user_assets: [],
    accounts_data: [],
  },
  accounts: [],
  // social_account_info: [],
})

const derived = derive({
  username: (get) => getUsername(get(userStore).info),
})

function getUsername(info: TUserInfo) {
  if (!info) return '-'
  if (info.user_data.user_name) return info.user_data.user_name
  const currentAccount = info.accounts_data.find((item) => item.current_account)
  if (!currentAccount) return '-'
  if (['email'].includes(currentAccount.account_type)) {
    return currentAccount.account
  } else if (['blockchain', 'wallet', 'block_chain'].includes(currentAccount.account_type)) {
    if (['-239', '-3'].includes(currentAccount.chain)) {
      return ShortenAddress(toUserFriendlyAddress(currentAccount.account), 6)
    } else {
      return ShortenAddress(currentAccount.account, 6)
    }
  }
  return '-'
}

export async function getUserDetail() {
  const res = await userApi.getUserInfo()
  userStore.info = res.data
  userStore.accounts = res.data.accounts_data
  // userStore.social_account_info = res.social_account_info || []
  return res.data
}

export async function updateUserDetail(data: TUserUpdateParams) {
  await userApi.updateUserInfo(data)
  return await getUserDetail()
}

export const userStoreActions = {
  getUserDetail,
  updateUserDetail,
}

export function useUserStore() {
  return {
    ...useSnapshot(userStore),
    ...derived,
  }
}
