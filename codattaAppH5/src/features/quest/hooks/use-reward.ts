import { useEffect } from 'react'

import taskApi from '@/api-v2/task.api'
import { useRequest } from '@/hooks/use-request'
import { taskStoreActions } from '@/store/task.store'
import Toast from '@/utils/toast'

export default function useReceiveRewardHook(task: Codatta.Task.Task) {
  const { loading, error, status, data, fetch } = useRequest(() => taskApi.receiveReward(task.instance_id!), {
    manual: true,
  })

  useEffect(() => {
    if (error) {
      Toast.fail(error.message)
    }
  }, [error])

  useEffect(() => {
    if (status === 'success') {
      data && handleReceiveRewardData(data.data)
    }
  }, [status])

  async function handleReceiveRewardData(rewards: Codatta.Task.RewardResult) {
    // ReactGA.event('receive_quest_reward')
    Toast.success(
      `You have earned ${rewards?.map((reward) => reward.reward_value + ' ' + reward.reward_type).join(', ')}`,
    )

    await taskStoreActions.getTasks()
  }

  return { loading: loading, handleReceiveReward: fetch }
}

// {
//     "data": {
//         "link": "https://discord.com/oauth2/authorize?client_id=1263442549805285456&response_type=code&redirect_uri=https%3A%2F%2Fapp.codatta.io%2Faccount%2Fsocial%2Flink%2Fdiscord&scope=identify+guilds"
//     },
//     "success": true,
//     "errorCode": 0,
//     "errorMessage": "SUCCESS"
// }
