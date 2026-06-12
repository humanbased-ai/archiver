import { useEffect } from 'react'
import { Loader2 as Loader } from 'lucide-react'

import codattaCoinIcon from '@/assets/icons/svg/coin.svg'

import NoData from '@/components/ui/no-data'
import Card from '@/features/quest/components/card'

import { taskStoreActions, useTaskStore } from '@/store/task.store'
import { TRACK_CATEGORY, trackEvent } from '@/utils/ga'
import TransitionEffect from '@/components/ui/transition-effect'

export function Component() {
  const { loading, sortTasks, tasks } = useTaskStore()

  useEffect(() => {
    taskStoreActions.getTasks()
  }, [])

  useEffect(() => {
    if (tasks.length) {
      trackEvent(TRACK_CATEGORY.QUEST_VIEW_LIST, {
        extra: { list: tasks.map(({ task_id }) => task_id).slice(0, 4) },
      })
    }
  }, [tasks])

  return (
    <TransitionEffect className="p-4 pt-8">
      <h1 className="flex items-center justify-center">
        <img className="mr-2 block h-auto w-12" src={codattaCoinIcon} />
        <span className="text-lg font-extrabold">Earn more rewards</span>
      </h1>
      {!sortTasks.length && (
        <div className="flex h-[300px] items-center justify-center">
          {loading ? <Loader className="animate-spin"></Loader> : <NoData text="No Task found" className="" />}
        </div>
      )}
      {sortTasks.map((task) => (
        <Card key={task.task_id} task={{ ...task, rewards: [...task.rewards] }} />
      ))}
    </TransitionEffect>
  )
}

