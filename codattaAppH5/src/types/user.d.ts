namespace Codatta.User {
  /**
   * 在typescript中，enum 类型可以作为值使用，也可作为类型使用
   */
  enum Role {
    S3 = 'S3_CHECK',
  }

  interface AccountInfo {
    id: number
    user_id: string
    account_out_code: string
    account: string
    account_type: string
    chain: 'eip155'
    connector: 'dynamic' | 'ton'
    wallet_name: string
    public_identifier: string,
  }

  type SocialAccountInfo = { channel: string; name: string }

  interface CurrentAccountInfo {
    account: string,
    account_type: 'email' | 'blockchain' | 'wallet' | null,
    connector: "dynamic" | 'ton' | 'wallet' | null,
    login_wallet_source:string
  }

  interface Info {
    avatar_url: string
    username: string | null
    email: string | null
    user_id: string
    code: string
    roles: string | null
    inviter_code: string | null
    status: string
    wallet_address: string | null
    new_user: boolean
    tg_id?: number
    accounts?: AccountInfo[]
    social_account_info?: SocialAccountInfo[],
    current_account_info: CurrentAccountInfo
  }

  /** 简略用户信息 */
  type InfoSummary = {
    avatar: Info['avatar_url']
    flag: boolean
    rank: number
  } & Pick<Info, 'email' | 'user_id'>

  /** 可修改的用户字段 */
  type InfoEditable = Pick<Info, 'username' | 'avatar_url' | 'inviter_code'>

  interface InviteRecordItem {
    id: string
    date: string
    email: string
    address: string
    reward: number
  }

  interface InviteRecords {
    total_count: number
    total_reward: number
    result: InviteRecordItem[]
  }

  interface RewardItem {
    address: string
    amount: number
    award_stage: string
    category: string
    entity: string
    network: string
    transaction_id: string
  }

  type Rewards = RewardItem[]
}
