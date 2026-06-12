import { ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Popup } from 'react-vant'

import TransitionEffect from '@/components/ui/transition-effect'
import PageHead from '@/components/page/page-head'
import { GradientButton } from '@/components/ui/button'

import { useUserStore, userStoreActions } from '@/store/user.store'
import { authStoreActions } from '@/store/auth.store'

import Toast from '@/utils/toast'
import { TRACK_CATEGORY, trackEvent } from '@/utils/ga'
import { toUserFriendlyAddress, useTonConnectUI } from '@tonconnect/ui-react'
import { ShortenAddress } from '@/utils/wallet-address'

function UserSettingItem(props: {
  title: string | React.ReactNode
  extra: string | React.ReactNode
  onClick?: () => void
}) {
  const { title, extra, onClick } = props
  return (
    <div className="flex h-12 cursor-pointer items-center justify-between px-8" onClick={onClick}>
      <div className="">{title}</div>
      <div className="text-gray-400">{extra}</div>
    </div>
  )
}

function UsernameSetting({ username }: { username: string }) {
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  async function handleUpdateUsername() {
    trackEvent(TRACK_CATEGORY.ACCOUNT_USERNAME_SAVE_CLICK)

    if (!inputText) {
      Toast.info('Please input username')
      return
    }

    setLoading(true)
    try {
      const res = await userStoreActions.updateUserDetail({
        update_key: 'USER_NAME',
        update_value: inputText,
      })
      Toast.success('Update success')
    } catch (err: any) {
      console.error(err?.message)
      Toast.fail(err.message || 'Exception occurred! please try again.')
    }
    setLoading(false)
    setIsEditing(false)
  }

  function onUsernameClick() {
    trackEvent(TRACK_CATEGORY.ACCOUNT_USERNAME_EDITE_CLICK)
    setIsEditing(true)
  }

  return (
    <>
      <UserSettingItem
        title="Username"
        onClick={onUsernameClick}
        extra={
          <div className="flex items-center gap-2">
            <span>{username}</span>
            <ChevronRight size={20} />
          </div>
        }
      ></UserSettingItem>
      <Popup closeable={true} closeOnClickOverlay={true} visible={isEditing} className='bg-purple-950 p-6 rounded-xl' onClose={() => setIsEditing(false)}>
        <div className="mb-4 text-lg font-bold text-white">User Name</div>
        <input
          className="mb-8 w-full rounded-md border border-gray-300 bg-transparent text-white"
          maxLength={14}
          onInput={(e) => setInputText(e.currentTarget.value)}
        ></input>
        <GradientButton loading={loading} className="w-full py-2 text-white" onClick={handleUpdateUsername}>
          Save
        </GradientButton>
      </Popup>
    </>
  )
}

function LogoutComfirm() {
  const [logoutModalVisible, setLogoutModalVisible] = useState(false)
  const [tonConnectUI] = useTonConnectUI()

  return (
    <>
      <div className="mx-auto mt-auto w-[300px] p-8">
        <button
          onClick={() => setLogoutModalVisible(true)}
          className="w-full rounded-xl border border-gray-500 px-4 py-2 text-gray-200"
        >
          Log out
        </button>
      </div>
      <Popup
        visible={logoutModalVisible}
        position="center"
        closeOnClickOverlay
        onClose={() => setLogoutModalVisible(false)}
        style={{
          width: '80%',
          maxWidth: '300px',
          padding: '24px',
          borderRadius: '24px',
          border: '1px solid #491B77',
          backgroundColor: '#130C1B',
        }}
      >
        <p className="mb-4 text-center text-lg text-white">Are you sure to log out?</p>
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setLogoutModalVisible(false)}
            className="rounded-xl border border-gray-400 px-4 py-2 text-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              trackEvent(TRACK_CATEGORY.LOGOUT)
              setLogoutModalVisible(false)
              tonConnectUI.disconnect()
              authStoreActions.logout()
            }}
            className="w-24 rounded-xl border border-purple-600 bg-purple-600 px-4 py-2 text-sm text-white transition-all"
          >
            Log Out
          </button>
        </div>
      </Popup>
    </>
  )
}

export function Component() {
  const { info, username, accounts } = useUserStore()

  const walletAccounts = useMemo(() => {
    return accounts?.filter((item) => ['blockchain', 'wallet', 'block_chain'].includes(item.account_type))
  }, [info])

  function getWalletAddress({ account, connector }: any) {
    if (connector === 'ton') {
      console.log(account, connector)
      return ShortenAddress(toUserFriendlyAddress(account), 8)
    } else return ShortenAddress(account, 8)
  }

  return (
    <TransitionEffect className="flex h-full flex-col text-sm">
      <div className="sticky top-0">
        <PageHead title="User Settings" className="z-10 m-auto mb-10 w-full max-w-[480px] px-4"></PageHead>
      </div>

      <div className="mb-4 bg-purple-950 py-4 text-center">
        <img src={info.user_data.avatar} className="mx-auto mb-2 h-20 w-20 rounded-full" alt="" />
        <div className="h-8 text-lg leading-8 text-white">
          <p>{username}</p>
        </div>
      </div>

      <div>
        <UsernameSetting username={info.user_data.user_name ?? 'Null'} />
        {walletAccounts?.map((item, index) => {
          return (
            <UserSettingItem
              key={index}
              title="Wallet Address"
              extra={`${item.wallet_name} : ${getWalletAddress(item)}`}
            />
          )
        })}
        {/* <UserSettingItem title="Wallet Address" extra={info.wallet_address}></UserSettingItem> */}
        <UserSettingItem title="My referral code" extra={info.user_data.referee_code}></UserSettingItem>
      </div>
      <LogoutComfirm />
    </TransitionEffect>
  )
}
