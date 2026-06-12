namespace Codatta.Game {
  interface ConfigItem {
    is_specify_area?: boolean // 是否为指定区域
    rarity?: number // 稀有度
    angle?: number // 角度
    icon?: string // 图标
    color?: string // 颜色
    content: string[] // 文本内容，最多两个
    score: number // 分数
  }

  type PartitionItem = [number, number] // [分区模块， 分区角度]

  enum Level {
    'C',
    'B',
    'A',
    'S',
    'SS',
    'SSS',
  }

  type LevelInterval = [string, number, number, string] // [等级， 分数最小值， 分数最大值, 文案提示]

  interface RoundItem {
    title: string // 标题
    round?: string
    knives: number
    partitions: PartitionItem[][]
    config: ConfigItem[][]
  }

  export interface SettleResult {
    settle_id: string
    user_id: string
    ticker_id: string
    score: number
    rating: string
    reward_value: number
    ticker_count: number
    cases: string[]
  }
}
