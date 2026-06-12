import request from './base'

class HomeApi {
  async getInfo(): Promise<Codatta.Home.Info> {
    const { data } = await request.post('/tg/homepage')
    return data
  }
}

export default new HomeApi()
