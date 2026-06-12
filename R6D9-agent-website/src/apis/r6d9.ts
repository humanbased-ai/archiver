import { AxiosInstance } from 'axios'
import request from './request'

type TVerifyStatus = 0 | 1 | 2

class twitterApi {
  constructor(private request: AxiosInstance) {}


  async getTwitterVerifyCode(userId: string) {
    const res = await this.request.post<{
      data: {
        code: string
      }
    }>('/r6d9/twitter/code', { user_id: userId })
    return res.data
  }

  async getTwitterUserInfo(userId: string) {
    const res = await this.request.post<{
      data: {twitter_user_name: string}
    }>('/r6d9/twitter/user', { user_id: userId })
    return res.data
  }

  async verifyTwitter(userId: string, twitterShareLink: string) {
    const res = await this.request.post<{
      data: {
        status: TVerifyStatus, twitter_user_name: string, message: string
      }
    }>('/r6d9/twitter/verify', { user_id: userId, link: twitterShareLink })
    return res.data
  }

  async unbindTwitter(userId: string) {
    const res = await this.request.post<{

    }>('/r6d9/twitter/unbind', {user_id: userId})

    return res.data
  }
}

export default new twitterApi(request)
