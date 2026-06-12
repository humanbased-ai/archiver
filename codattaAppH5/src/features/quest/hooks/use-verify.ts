import { useEffect } from 'react'

import taskApi from '@/api-v2/task.api'
import { useRequest } from '@/hooks/use-request'
import { taskStoreActions } from '@/store/task.store'
import Toast from '@/utils/toast'

export default function useVerifyHook(task: Codatta.Task.Task) {
  const { loading, error, data, status, fetch } = useRequest(() => taskApi.verify(task.task_id), { manual: true })

  useEffect(() => {
    if (error) {
      Toast.fail(error.message)
    }
  }, [error])

  useEffect(() => {
    if (status === 'success') {
      data && handleVerifyData(data.data)
    }
  }, [status])

  async function handleVerifyData(data: Codatta.Task.VerifyResult) {
    if (data.verify_result === 'PASSED') {
      Toast.success(
        `You have earned ${data.rewards.map((reward) => reward.reward_value + ' ' + reward.reward_type).join(', ')}`,
      )
      await taskStoreActions.getTasks()
    } else {
      Toast.fail(
        data.msg ||
          'Verification failed. No quests completion were detected. Please carefully review the quest requirements.',
      )
    }
  }

  return { loading: loading, verify: fetch }
}
