import { AxiosInstance } from 'axios'
import request from './request'

type TAccountType = 'email' | 'block_chain'
export type TAccountRole = 'B' | 'C'
export type TDeviceType = 'WEB' | 'TG' | 'PLUG'

export interface ILoginResponse {
  token: string
  old_token: string
  user_id: string,
  new_user: boolean
}

interface ILoginParamsBase {
  account_type: string
  connector: 'codatta_email' | 'codatta_wallet' | 'codatta_ton'
  account_enum: TAccountRole,
  inviter_code: string
  source: {
    device: TDeviceType,
    channel: string,
    app: string,
    [key:string]: any
  },
  related_info?: {
    [key:string]: any
  }
}

interface IEmailLoginParams extends ILoginParamsBase {
  connector: 'codatta_email'
  account_type: 'email'
  email:string,
  email_code: string
}

interface IWalletLoginParams extends ILoginParamsBase {
  connector: 'codatta_wallet'
  account_type: 'block_chain'
  address: string
  wallet_name: string
  chain: string
  nonce: string
  signature: string
  message: string
}

interface ITonLoginParams extends ILoginParamsBase {
  connector: 'codatta_ton'
  account_type: 'block_chain'
  wallet_name: string,
  address: string,
  chain: string,
  connect_info: object[]
}

class AccountApi {

  private _apiBase = ''

  constructor(private request: AxiosInstance) { }

  public setApiBase(base?: string) {
    this._apiBase = base || ''
  }

  public async getNonce(props: { account_type: TAccountType}) {
    const { data } = await this.request.post<{ data: string }>(`/user/nonce`, props)
    return data.data
  }

  public async getEmailCode(props: { account_type: TAccountType , email: string}) {
    const { data } = await this.request.post<{ data: string }>(`/user/get_code`, props)
    return data.data
  }

  public async emailLogin(props: IEmailLoginParams) {
    const res = await this.request.post<{ data: ILoginResponse }>(`/user/login`, props)
    return res.data
  }

  public async walletLogin(props: IWalletLoginParams) {
    const res = await this.request.post<{ data: ILoginResponse }>(`/user/login`, props)
    return res.data
  }

  public async tonLogin(props: ITonLoginParams) {
    const res = await this.request.post<{ data: ILoginResponse }>(`/user/login`, props)
    return res.data
  }
}

export default new AccountApi(request)
