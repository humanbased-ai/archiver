import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

import { TRACK_CATEGORY, trackEvent } from '@/utils/ga'

import gameApi from '@/api/game.api'
import { gameStoreActions, useGameStore } from '../game.store'

import Loading from './loading'

export default function GameOver() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const { totalScore, currentLevel } = useGameStore()

  async function submit() {
    let tickerId = ''
    setLoading(true)

    try {
      tickerId = await gameApi.getTickerId()
      await gameApi.settle({
        ticker_id: tickerId,
        score: totalScore,
        rating: currentLevel,
      })

      trackEvent(TRACK_CATEGORY.GAME_SETTLE, {
        extra: { ticker_id: tickerId, score: totalScore, rating: currentLevel },
      })

      setLoading(false)
      jumpToResult()
    } catch (error) {
      console.error('Oops! Something went wrong.', error)
      setLoading(false)
    }

    function jumpToResult() {
      gameStoreActions.setIsGameOver(false)
      navigate(`/game/result?ticker_id=${tickerId}`)
    }
  }

  useEffect(() => {
    submit()
  }, [])
  return <>{loading && <Loading />}</>
}
