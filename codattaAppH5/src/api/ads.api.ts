import request from './base'

export const StakeType = {
  TON_USDT: 'TON_USDT',
  POINT: 'POINT',
  TON: 'TON',
}

export const AdsType = {
  IMAGE: 'IMAGE',
  TEXT: 'TEXT',
  VIDEO: 'VIDEO',
}

interface AdsHistoryQueryParams {
  page_size: number
  last_id?: number
  asset_type: 'ton_usdt' | 'codatta'
}

class AdsApi {
  async getAdsState(): Promise<Codatta.Ads.AdsState> {
    const res = await request.post('/ads/user/info')
    return res.data
  }

  async signAgreement() {
    const res = await request.post('/ads/user/agreement/sign')
    return res.data
  }

  async getUserAnnotation(): Promise<Codatta.Ads.AdsUserAnnotation> {
    const res = await request.post('/ads/annotation/info')
    return res.data
  }

  async collectUserAnnotation(info: Codatta.Ads.AdsUserAnnotation) {
    const res = await request.post('/ads/annotation/collect', info)
    return res.data
  }

  // @MockApi({ importData: () => import('@/api/mock/ads/ads-list.json'), open: true })
  async getAdsList(): Promise<Codatta.Ads.AdsItem[]> {
    const res = await request.post('/ads/pull')
    return res.data
  }

  async postAdsFeedback(feedback: Codatta.Ads.AdsFeedback) {
    const res = await request.post('/ads/feedback', feedback)
    return res.data
  }

  async getAnnotationDicts(): Promise<Codatta.Ads.AdsAnnoationDicts> {
    const res = await request.post('/ads/annotation/dict')
    return res.data
  }

  async getUserAgeDict(): Promise<{
    age_dict: Codatta.Ads.AdsAnnoationDict[]
    county_dict: Codatta.Ads.AdsAnnoationDict[]
  }> {
    const res = await request.post('/ads/annotation/dict')
    return res.data
  }

  async consultStake(): Promise<Codatta.Ads.AdsStakeInfo> {
    const res = await request.post('/ads/staking/consult')
    return res.data
  }

  async consultRedemption(): Promise<Codatta.Ads.AdsRedemptionInfo> {
    const res = await request.post('/ads/redemption/consult')
    return res.data
  }

  async redemptionPoints(data: { staking_order_id: string }) {
    const res = await request.post('/ads/redemption/initiation', data)
    return res.data
  }

  async pointStaking(staking_type: string, staking_amount: number) {
    const res = await request.post('/ads/staking/initiation', {
      staking_type,
      staking_amount,
    })
    return res.data
  }

  async saveStakingResult(amount: number, txHash: string, address: string) {
    const res = await request.post('/ads/staking/contract', {
      chain: 'TON',
      staking_type: 'TON_COIN',
      staking_amount: amount,
      tx_hash: txHash,
      address: address,
    })
    return res.data
  }

  async getStakeHistory(params: {}): Promise<Codatta.Ads.AdsStakingHistory> {
    const res = await request.post('/ads/staking/history', params)
    return res.data
  }
  async saveRedemption(data: {
    chain: string
    staking_order_id: string
    tx_hash: string
    // sig_data: string
    // signature: string
  }) {
    const res = await request.post('/ads/redemption/contract', data)
  }

  async saveVerification(data: {
    profile_photo_url: string
    education_photo_url: string
    occupation_photo_url: string
    web3_asset_photo_url: string
    linkedin_url: string
  }) {
    const res = await request.post('/ads/annotation/verify', data)
    return res.data
  }

  async getReardConfig() {
    const res = await request.post('/ads/user/reward/config')
    return res.data
  }

  async claimReward() {
    const res = await request.post('/ads/annotation/award')
    return res.data
  }

  async getAdsRedirection() {
    const res = await request.post('/ads/redirection/get')
    return res.data
  }

  async getBocParsedData(hashHex: string) {
    // 这个地址可以从env文件中取，需要配置下
    const res = await request.get(`https://testnet.tonapi.io/v2/blockchain/transactions/${hashHex}`) //测试地址
    // const res = await request.get(`https://tonapi.io/v2/blockchain/transactions/${hashHex}`) // 线上地址
    return res.data
  }
}

export default new AdsApi()
