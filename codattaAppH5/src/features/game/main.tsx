import { useEffect, useRef } from 'react'
import Phaser from 'phaser'

import LoadingScreen from './components/progress'
import GameInfo from './components/game-info'
import GameOver from './components/game-over'

import { gameStoreActions, useGameStore } from './game.store'

import { GAME_CONFIG } from './config'

export const Game = () => {
  const gameRef = useRef<Phaser.Game | null>(null)
  const { loadProgress, isGameOver } = useGameStore()

  useEffect(() => {
    gameRef.current = new Phaser.Game({ ...GAME_CONFIG, parent: 'game-container' })

    return () => {
      gameStoreActions.setIsGameOver(false)
      if (gameRef.current) {
        gameRef.current.destroy(true)
      }
    }
  }, [])

  useEffect(() => {
    if (loadProgress >= 100 && gameRef.current) {
      console.log('GameScene start', loadProgress)
      gameRef.current?.scene.start('GameScene')
    }
  }, [loadProgress, gameRef.current])

  return (
    <>
      {isGameOver ? <GameOver /> : loadProgress < 100 ? <LoadingScreen /> : <GameInfo />}
      <div id="game-container" className='flex justify-center' />
    </>
  )
}
