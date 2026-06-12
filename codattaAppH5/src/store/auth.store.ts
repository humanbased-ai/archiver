import { TonProofItemReplySuccess } from '@tonconnect/ui-react'
import { proxy, snapshot, subscribe, useSnapshot } from 'valtio'
import cookies from 'js-cookie'

import { getTgStore } from '@/store/tg.store'
import { userStoreActions } from '@/store/user.store'
import { loadState, saveState } from '@/store/serialized-state'
import accountApiV2 from '@/api-v2/account.api'
import Toast from '@/utils/toast'
import { TRACK_CATEGORY, trackEvent } from '@/utils/ga'

export interface AuthStore {
  token: string
  uid: string
  auth: string
  isLoginedIn: boolean
  channelCode: string // 用户渠道来源
  inviterCode: string // 用户邀请码
}

const STORAGE_KEY = 'codatta_auth_store'
const CHANNEL_KEY = '_ch'
const INVITER_CODE_KEY = '_ic'
const queryString = new URLSearchParams(window.location?.search)

/**
 * store是异步的，TODO
 */

// resetState(STORAGE_KEY)
const lastStore = loadState(STORAGE_KEY)
const authStore = proxy<AuthStore>({
  uid: lastStore?.uid || '',
  token: lastStore?.token || '',
  auth: lastStore?.auth || '',
  inviterCode: queryString.get(INVITER_CODE_KEY) || '',

  get isLoginedIn() {
    return !!this.uid && !!this.token && !!this.auth
  },

  get channelCode(): string {
    return cookies.get(CHANNEL_KEY) || ''
  },

  set channelCode(val: string | undefined) {
    if (val) {
      cookies.set(CHANNEL_KEY, val, { expires: 365 })
    } else {
      cookies.remove(CHANNEL_KEY)
    }
  },
})

subscribe(authStore, () => saveState(STORAGE_KEY, authStore))

if (queryString.get(CHANNEL_KEY)) {
  authStore.channelCode = queryString.get(CHANNEL_KEY) || ''
}

function checkLogin() {
  return authStore.isLoginedIn
}

function syncTgUserInfo() {
  const tgStore = getTgStore()

  if (tgStore.user.id) {
    userStoreActions.updateUserDetail({
      update_key: 'USER_NAME',
      update_value: tgStore.user.username,
    })
  }
}

async function tonLogin(walletInfo: any) {
  try {
    const account = walletInfo.account
    const channel = cookies.get(CHANNEL_KEY) || 'codatta-app-h5'
    const inviterCode = authStore.inviterCode

    const res = await accountApiV2.tonLogin({
      account_type: 'block_chain',
      connector: 'codatta_ton',
      account_enum: 'C',
      wallet_name: walletInfo?.device.appName,
      inviter_code: inviterCode,
      address: account.address,
      chain: account.chain,
      connect_info: [
        {name: 'ton_addr', network: walletInfo.account.chain, ...account},
        walletInfo.connectItems?.tonProof
      ],
      source: {
        device: 'TG',
        channel: channel,
        app: 'codatta-app-h5'
      },
    })

    authStore.token = res.data.old_token
    authStore.uid = res.data.user_id
    authStore.auth = res.data.token

    // 如果是新用户，则将tg的用户昵称和id同步到后端
    if (res.data.new_user) {
      trackEvent(TRACK_CATEGORY.SIGN_UP)
      syncTgUserInfo()
    } else {
      trackEvent(TRACK_CATEGORY.LOGIN)
    }
    return res
  } catch (e: any) {
    console.error('tonLogin error: ' + e?.message)
    Toast.fail('Login Failed!')
  }
}

async function emailLogin(email: string, code: string) {

  const inviterCode = authStore.inviterCode
  const channel = cookies.get(CHANNEL_KEY) || 'codatta-app-h5'

  const res = await accountApiV2.emailLogin({
    account_type: 'email',
    connector: 'codatta_email',
    account_enum: 'C',
    email_code: code,
    email: email,
    inviter_code: inviterCode,
    source: {
      device: 'TG',
      channel: channel,
      app: 'codatta-app-h5'
    },
  })    
  
  authStore.token = res.data.old_token
  authStore.uid = res.data.user_id
  authStore.auth = res.data.token

  // 如果是新用户，则将tg的用户昵称和id同步到后端
  if (res.data.new_user) {
    trackEvent(TRACK_CATEGORY.SIGN_UP)
    syncTgUserInfo()
  } else {
    trackEvent(TRACK_CATEGORY.LOGIN)
  }

  return res
}

function logout() {
  console.warn('logout: ')
  authStore.uid = ''
  authStore.token = ''
  authStore.auth = ''
  window.location.href = '/m/account/signin'

  trackEvent(TRACK_CATEGORY.LOGOUT)
  // window.location.href = '/m'
}

/**
 * 非hook得方式获取authStore快照
 * @returns
 */
function getAuthStore() {
  return snapshot(authStore)
}

export function useAuthStore() {
  return useSnapshot(authStore)
}

function setReferralCode(code:string) {
  authStore.inviterCode = code
}

export const authStoreActions = {
  getAuthStore,
  emailLogin,
  logout,
  checkLogin,
  tonLogin,
  setReferralCode
}
