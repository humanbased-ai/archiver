import request from './base'

class UserApi {
  // async getInfo() {
  //   return (await request.get<UserInfo>('/tg/user/info')).data
  // }

  async getDetail() {
    const { data } = await request.get<Codatta.User.Info>('/tg/user/details')
    return data
  }

  // async getBalance() {
  //   const {
  //     data: { balance },
  //   } = await request.post<{ balance: number }>('/tg/user/token/info')
  //   return balance
  // }

  async updateInfo(userFields: Partial<Codatta.User.InfoEditable>) {
    const { data } = await request.post<boolean>('/tg/user/update', userFields)
    return data
  }

  // @MockApi({ importData: () => import('@/api/mock/referral/records.json'), open: true })
  async getInviteRecords(pagination: Codatta.Api.PaginationParam = { page: 1, page_size: 20 }) {
    // return (await request.post<Codatta.User.InviteRecords>('/tg/user/inviter/entry', pagination)).data
    return (await request.post<Codatta.User.InviteRecords>('/user/inviter/entry', pagination)).data
  }

  // async getReputation() {
  //   const { data } = await request.post<{ reputation: string } | null>('/tg/user/reputation/info')
  //   return data?.reputation ?? '0'
  // }

  // async getRewards(pagination: Codatta.Pagination = { current: 1, pageSize: 20 }) {
  //   const { data } = await request.post<UserReword[]>('/tg/user/rewards', {
  //     page: pagination.current,
  //     page_size: pagination.pageSize
  //   })
  //   return data
  // }

  async getCodeUsername(code: string): Promise<string> {
    const { data } = await request.get<any>(`/tg/user/username?code=${code}`)
    return data
  }
}

const userApi = new UserApi()
export default userApi
