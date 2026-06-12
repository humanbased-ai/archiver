import request from './base'

class OkxActivityApi {


  async getCampaignInfo() {
    const res = await request.post<any>('/campaign/landing_page', {
      campaign_supplier: 'okx'
    })
    return res.data
  }

  async claimReward() {
    const res = await request.post('/campaign/claim/reward', {campaign_supplier: "okx"})
    return res.data
  }
  
  async getCheckInInfo(): Promise<any> {
    const res = await request.post('/campaign/check-in/consult', {campaign_supplier: "okx"})
    return res.data
  }
  async campaignCheckIn() {
    const res = await request.post('/campaign/check-in/check-in', {campaign_supplier: "okx"})
    return res.data
  }
}

export default new OkxActivityApi()