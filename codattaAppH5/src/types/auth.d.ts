namespace Codatta.Auth {
  interface TonConnectParams {
    wallet_name: string
    account: {
      address: string
      chain: string
      walletStateInit: string
      publicKey: string
    }
    ton_proof: {
      domain_len: number
      domain_val: string
      payload: string
      signature: string
      timestamp: number
    }
  }

  interface LoginParams {
    connector: string
    channel: string
    inviter_code: string
    connect_info: {
      ton?: TonConnectParams
      dynamic?: string
    }
  }

  interface LoginInfo {
    token: string
    user_info: Codatta.User.Info
  }
}
