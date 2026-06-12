import { CHAIN } from '@tonconnect/ui-react'
import request from './base'

export interface TonConnectParams {
  wallet_name: string
  account: {
    address: string
    chain: CHAIN
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

class AuthApi {
  async getNonce() {
    return request.get<string>('/tg/wallet/sign/nonce').then((res) => res.data)
  }

  async tonLogin(channel: string, inviter_code: string, params: Codatta.Auth.TonConnectParams) {
    console.log('tonLogin', channel, inviter_code, params)
    return request
      .post<{ token: string; user_info: Codatta.User.Info }>('/tg/login', {
        connector: 'ton',
        channel,
        inviter_code,
        connect_info: { ton: params },
      })
      .then((res) => res.data)
  }

  async dynamicLogin(channel: string, inviter_code: string, token: string) {
    console.log('dynamicLogin', channel, inviter_code, token)
    return request
      .post<{ token: string; user_info: Codatta.User.Info }>('/tg/login', {
        connector: 'dynamic',
        channel,
        inviter_code,
        connect_info: { dynamic: token },
      })
      .then((res) => res.data)
  }

  async linkTonWallet(params: Codatta.Auth.TonConnectParams) {
    return request.post('/user/account/bind', {
      connector: 'ton',
      connect_info: { ton: params },
    }).then((res) => res.data)
  }

  async getEmailCaptcha() {
    const { data } = await request.post('/user/get_image_code')
    return data
  }

  async getEmailCode(email: string, captcha:string) {
    return request.post('/user/get_code', { 
      email,
      image_code: captcha,
     }).then((res) => res.data)
  }

  async emailLogin(email: string, code: string) {
    return request.post('/tg/login', {
      connector: "email",
      connect_info: {
        email, email_code: code
      }
    }).then((res) => res.data)
  }

  // linkTonWallet(params: TTonConnectParams) {
  //   return request
  //     .post('/user/account/bind', {
  //       connector: 'ton',
  //       connect_info: { ton: params },
  //     })
  //     .then((res) => res.data)
  // }

  // linkDynamic(token: string) {
  //   return request
  //     .post('/user/account/bind', {
  //       connector: 'dynamic',
  //       connect_info: { dynamic: token },
  //     })
  //     .then((res) => res.data)
  // }

  // unlinkAccount(accountId: number) {
  //   return request
  //     .post('/user/account/unbind', {
  //       account_id: accountId,
  //     })
  //     .then((res) => res.data)
  // }
}

export default new AuthApi()
