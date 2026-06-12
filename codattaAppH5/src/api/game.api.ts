import { isArray } from 'lodash'
import request, { MockApi } from './base'
// import config from '@/api/mock/game/config.json'

class GameApi {
  // 获取游戏配置
  // @MockApi({ importData: () => import('@/api/mock/game/config.json'), open: true })
  async getConfig(): Promise<{
    rounds: Codatta.Game.RoundItem[]
    levels: Codatta.Game.LevelInterval[]
  }> {
    const res = await request.get(`/tg/game/config`)
    // const res = config as any
    return {
      rounds: res.data.rounds,
      levels: res.data.levels,
    }
  }
  // 获取门票，有ticker_count不为0，则返回ticker_id，每次只返回一个
  async getTickerId(): Promise<string> {
    const res = await request.post('/tg/game/ticker')
    return res.data?.ticker_id
  }

  // 游戏结算
  async settle(data: { ticker_id: string; score: number; rating: string }): Promise<{ score: number; rating: string }> {
    const res = await request.post('/tg/game/ticker/settle', data)
    return res.data
  }

  //   // 结算结果查询-带分页
  async getResult(
    ticker_id: string,
    options?: {
      page?: number
      page_size?: number
    },
  ): Promise<Codatta.Game.SettleResult> {
    const res = await request.post(
      '/tg/game/settle/query',
      Object.assign({ ticker_id, page: 1, page_size: 1 }, options),
    )
    return isArray(res.data) ? res.data[0] : res.data
  }
}

export default new GameApi()
