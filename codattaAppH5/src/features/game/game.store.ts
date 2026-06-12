import { proxy, useSnapshot } from 'valtio'
import { derive } from 'valtio/utils'

import gameApi from '@/api/game.api'
import Toast from '@/utils/toast'

// 运行时状态
interface RuntimeState {
  canPlay: boolean
  gameSourceProgress: number
  isGameOver: boolean
  isGamePlaying: boolean
  isGameConfigLoaded: boolean
  currentRoundIndex: number
  currrentKnives: number
  totalScore: number
}

// 游戏配置状态
interface GameConfig {
  rounds: Codatta.Game.RoundItem[]
  levels: Codatta.Game.LevelInterval[]
}

// 创建运行时状态存储
const runtimeState = proxy<RuntimeState>({
  canPlay: false,
  isGameOver: false,
  isGamePlaying: false,
  isGameConfigLoaded: false,
  gameSourceProgress: 0,
  currentRoundIndex: 0,
  currrentKnives: 0,
  totalScore: 0,
})

// 创建游戏配置状态存储
const gameConfig = proxy<GameConfig>({
  rounds: [],
  levels: [],
})

export const gameStore = derive(
  {
    loadProgress: (get) =>
      Math.round(get(runtimeState).gameSourceProgress * 70) + (get(runtimeState).isGameConfigLoaded ? 30 : 0),

    isLastRound: (get) => get(runtimeState).currentRoundIndex === get(gameConfig).rounds.length - 1,

    currentLevel: (get) => {
      const totalScore = get(runtimeState).totalScore
      const levels = get(gameConfig).levels
      const index = levels.findIndex((level) => totalScore >= level[1] && totalScore <= level[2])
      return levels[index]?.[0] || 'C'
    },

    currentRound: (get) => get(gameConfig).rounds[get(runtimeState).currentRoundIndex],
  },
  {
    proxy: runtimeState,
  },
)

// 操作函数
const actions = {
  start: () => {
    runtimeState.canPlay = true
    runtimeState.isGameOver = false
    runtimeState.totalScore = 0
    runtimeState.currentRoundIndex = 0
    runtimeState.currrentKnives = gameConfig.rounds[0].knives || 3
    console.log('start', runtimeState.currentRoundIndex, runtimeState.currrentKnives)
  },

  nextRound: () => {
    if (gameStore.isLastRound) {
      runtimeState.isGameOver = true
      return
    }
    runtimeState.currentRoundIndex += 1
    runtimeState.currrentKnives = gameConfig.rounds[runtimeState.currentRoundIndex].knives || 3
    console.log('nextRound', runtimeState.currentRoundIndex, runtimeState.currrentKnives)
  },

  reduceKnives: () => {
    if (runtimeState.currrentKnives > 0) {
      runtimeState.currrentKnives -= 1
    }
  },

  addScore: (score: number) => {
    runtimeState.totalScore += score
  },

  setIsGameOver: (isGameOver: boolean) => {
    runtimeState.isGameOver = isGameOver
    runtimeState.isGameConfigLoaded = false
    runtimeState.gameSourceProgress = 0
  },

  setIsGamePlaying: (isGamePlaying: boolean) => {
    runtimeState.isGamePlaying = isGamePlaying
  },

  updateLoadProgress: (progress: number) => {
    runtimeState.gameSourceProgress = progress
  },

  getGameConfig: async () => {
    try {
      const res = await gameApi.getConfig()
      console.log('game config loaded')
      runtimeState.isGameConfigLoaded = true
      runtimeState.canPlay = true
      runtimeState.isGameOver = false
      gameConfig.rounds = res.rounds || []
      gameConfig.levels = res.levels || []
      actions.start()
      return res
    } catch (e) {
      Toast.fail('Failed to get game config')
      actions.getGameConfig()
      return false
    }
  },
}

// 导出
export const useGameStore = () => useSnapshot(gameStore)
export const gameStoreActions = actions
