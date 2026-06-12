namespace Codatta.Ads {
  interface AdsState {
    agreement_signed: boolean // 是否已签署用户协议
    is_add_annotation: boolean // 是否已添加用户标注
    is_staked: boolean // 是否已质押
    is_ads_play_finished: boolean // 是否已看完广告
    is_redemption: boolean // 用户是否已发起赎回
    points_to_claim?: number // 用户可以领取的奖励分数
    is_received?: boolean // 用户是否已领取
    annotation_level?: number //当前用户的标注积分
    balance: number
    received_points?: number
  }

  interface AdsUserAnnotation {
    gender: number //0:女，1:男
    age_dict_id: string | number
    country_and_region_id: string | number
    education_id: string | number
    occupation_id: string | number
    web3_asset_id: string | number
  }

  interface AdsAnnoationDict {
    dict_id: string
    dict_type: string
    display_name: string
  }

  interface AdsAnnoationDictItem {
    dict_id: number
    display_name: string
    icon?: string
  }

  interface AdsAnnoationDicts {
    age_dict: AdsAnnoationDictItem[]
    county_dict: AdsAnnoationDictItem[]
    education_dict: AdsAnnoationDictItem[]
    occupation_dict: AdsAnnoationDictItem[]
    web3_asset_dict: AdsAnnoationDictItem[]
  }

  interface AdsItem {
    ad_id: string
    ad_type: 'IMAGE' | 'TEXT' | 'VIDEO' // IMAGE,TEXT,VEDIO
    ad_content: string // 如果是IMAGE，就是url
    ad_description: string
  }

  interface AdsFeedback {
    ad_id: string
    feedback_type: number // 反馈类型，0 dislike，1 like
    stay_duration: number // 广告页面停留时长 单位秒 取不到可以不传
    finish_play: boolean // 是否已完成广告播放
  }

  interface AdsInitStake {
    staking_type: string
    staking_amount: number
  }

  interface AdsInitStakeResult {
    staking_order_id: string
    staking_amount: number
    status: string
    pay_network: string
    pay_address: string
  }

  interface AdsStakeTypeItem {
    text: string
    value: string
    icon: string
  }

  interface AdsStakeData {
    staking_order_id: string
    pay_info: {
      chain: string
      tx_hash: string
    }
  }

  interface AdsStakingOrder {
    staking_order_id: string
    staking_amount: number
    status: 'INIT' | 'FINISHED' | 'PENDING_CONFIRM' | 'FAILED'
    pay_network: 'TON' | 'Codatta'
    tx_hash: string
    address: string
    transaction_detail: string
  }

  interface AdsWithdrawOrder {
    redemption_order_id: string
    redemption_status: 'FINISHED'
    redemption_type: 'POINT'
    redemption_amount: number
    redemption_time: number
    gmt_create: string
  }

  interface AdsStakeInfo {
    amount_quantity: number //当前剩余的质押额度，如果为0了，不要进入质押流程
    user_available_point: number //当前当前用户的积分余额
    guarantee_url: string //三方担保的页面地址
    contract_exhibit_url: string //质押合约的展示url
    staking_contract_address: string // 职业合约地址
    staking_order?: AdsStakingOrder // 质押订单的信息，如果用户没质押不会返回,
    redemption_order?: AdsWithdrawOrder // 赎回的订单信息，如果用户没赎回不回返回,
    need_verify: boolean //用户发起赎回时，是否需要进行verify，赎回时会进行强校验
    verify_status: 'INIT' | 'PEDNING' | 'SUCCEED' | 'FATAL' | 'EXPIRED' //用户是否已经完成校验
  }

  interface AdsStakingHistory {
    total_staking_amount: number
    total_staking_points: number
    top_earns: AdsStakingHistoryItem[]
  }

  interface AdsStakingHistoryItem {
    staking_address: string
    staking_amount: number
    interest_amount: number
    staking_network: string
    id: number
    total_amount: number
    icon?: string
  }

  interface AdsRedemptionInfo {
    permit_date: string
    staking_order_id: string
    redemption_type: string
    redemption_amount: number
    staking_tx_hash: string
    address: string
    onchain_confirmed: boolean
    need_verify: boolean
    verify_status: 'INIT' | 'FINISHED' | 'PENDING'
    interest_amount: number
    penalty_amount: number
    slashed: boolean
    sig_data: string
    signature: string
    queryID?: number
  }
}
