import request from './base'

class AccountApi {
  async linkTonWallet(params: Codatta.Auth.TonConnectParams) {
      const res = await request.post('/user/account/bind', {
        connector: 'ton',
        connect_info: { ton: params },
      })
      return res.data
  }

  async linkDynamic(token: string) {
    return request
      .post('/user/account/bind', {
        connector: 'dynamic',
        connect_info: { dynamic: token },
      })
      .then((res) => res.data)
  }

  async unlinkAccount(accountId: number) {
    return request
      .post('/user/account/unbind', {
        account_id: accountId,
      })
      .then((res) => res.data)
  }

  async getSocialAccountLink(type: string) {
    return request.post('/user/sm/connect', { type }).then((res) => res.data)
  }

  async unlinkSocialAccount(type: string) {
    return request.post('/user/sm/unbind', { type }).then((res) => res.data)
  }

  async linkSocialAccount(type: string, param: any) {
    return request.post('/user/sm/bind', { type, value: param }).then((res) => res.data)
  }
}

export default new AccountApi()
