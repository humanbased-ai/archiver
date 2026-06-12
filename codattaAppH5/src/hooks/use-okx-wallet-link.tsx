import accountApi from "@/api/account.api"
import authApi from "@/api/auth.api"
import { userStoreActions, useUserStore } from "@/store/user.store"
import { ConnectedWallet, TonProofItemReplySuccess, useTonConnectUI, useTonWallet } from "@tonconnect/ui-react"
import { useEffect, useState } from "react"
import Toast from '@/utils/toast'

const useOkxLink = (init: boolean,  onFinish?: () => void) => {
  if (!init) return { handleLinkOkxWallet: () => {} }

  const [tonConnectUI] = useTonConnectUI()
  const { accounts } = useUserStore()

  // 这个是应为有多个按钮都会初始化，但是tonConnectUI只有一个，因此导致多个按钮都会监听到同一个状态的变化
  // 因此使用这个状态控制当前按钮是否监听连接状态变化。

  async function tonDisconnect() {
    try {
      await tonConnectUI.disconnect()
    } catch (err: any) {
      console.log(err.message)
    }
  }

  /**
   * 请注意，该方法需要为同步的方法，不能是异步的
   * 需要保证用户点击后唤起open，才能做到在ios中点后后出现唤起钱包的提示。
   */
  function handleLinkOkxWallet() {
    tonConnectUI.openSingleWalletModal("okxTonWallet")
  }

  async function handleOnTonStatusChange(wallet: any) {
    try {
      const address = wallet.account.address
      const isBind = accounts?.find(item => {
        return item.account === address
      })
      if (isBind) return

      const account = wallet.account
      const proof = wallet.connectItems?.tonProof as TonProofItemReplySuccess
      const res = await accountApi.linkTonWallet({
        wallet_name: wallet.device.appName,
        account: {
          address: account.address,
          chain: account.chain as any,
          walletStateInit: account.walletStateInit,
          publicKey: account.publicKey!,
        },
        ton_proof: {
          domain_len: proof.proof.domain.lengthBytes,
          domain_val: proof.proof.domain.value,
          payload: proof.proof.payload,
          signature: proof.proof.signature,
          timestamp: proof.proof.timestamp,
        },
      })
      onFinish?.()
    } catch (err: any) {
      tonDisconnect()
      Toast.fail(err.message)
    }
    userStoreActions.getUserDetail()
    initTonConnect()
  }

  async function initTonConnect() {
    tonConnectUI.setConnectRequestParameters({ state: 'loading' })
    const nonce = await authApi.getNonce()
    tonConnectUI.setConnectRequestParameters({ state: 'ready', value: { tonProof: nonce } })
  }

  useEffect(() => {
    initTonConnect()
    return tonConnectUI.onStatusChange((wallet: any) => {
      if (!wallet) return
      if (!wallet.connectItems?.tonProof) return
      handleOnTonStatusChange(wallet)
    })
  }, [])

  return { handleLinkOkxWallet }
}

export default useOkxLink