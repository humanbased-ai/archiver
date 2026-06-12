import cornerImage from '@/assets/images/quest/corner.svg'
import PercentBar from './percent-bar'
import TimePieBar from './time-pie-bar'
import { Box, LockBox } from './box'
import { buttons, LockedButton } from './button'
import CountdownBar from './countdown-bar'
import { taskStoreActions } from '@/store/task.store'

export default function Card({ task }: { task: Codatta.Task.Task }) {
  if (!task) return <></>

  if (task.locked) {
    return <LockCard task={task} />
  }

  return <NormalCard task={task} />
}

function NormalCard({ task }: { task: Codatta.Task.Task }) {
  const FirstButton = buttons[task.type]?.[task.status]?.[0]
  const SecondButton = buttons[task.type]?.[task.status]?.[1]

  function handleTimeout() {
    taskStoreActions.getTasks()
  }

  return (
    <div className="mt-4 rounded-2xl bg-[#252532]">
      <div className="flex justify-between justify-items-start">
        <div className="flex gap-4 p-4 pb-3 text-center text-xs font-semibold leading-3">
          {task.rewards?.map((reward) => {
            if (reward.reward_type === 'points') {
              return (
                <Box
                  icon="https://static.codatta.io/static/images/23910bf5647f1d35fa92e6b1688f5869e8335f16.png"
                  num={reward.reward_value}
                  key={reward.reward_icon}
                />
              )
            } else {
              return <Box icon={reward.reward_icon} num={reward.reward_value} key={reward.reward_icon} />
            }
          })}
        </div>
        <div
          className="box-border flex h-[61px] w-[227px] justify-end gap-1 bg-cover bg-right-top bg-no-repeat pr-1 pt-2"
          style={{ backgroundImage: `url(${cornerImage})` }}
        >
          {task.max_count && (
            <PercentBar
              max={task.max_count}
              current={['FINISHED', 'REWARDED'].includes(task.status) ? task.max_count : task.current_count || 0}
            />
          )}
          {task.refresh_time && (
            <TimePieBar refreshTime={task.refresh_time} duration={task.duration} onTimeout={handleTimeout} />
          )}
          {!task.refresh_time && task.start_time && task.expire_time && (
            <CountdownBar startTime={task.start_time} endTime={task.expire_time} />
          )}
        </div>
      </div>
      <p className="px-4 text-base">{task.name}</p>
      <footer className="flex items-center justify-between gap-4 p-4 text-center text-sm font-semibold leading-8">
        {FirstButton && <FirstButton task={task} />}
        {SecondButton && <SecondButton task={task} />}
      </footer>
      {task.status !== 'REWARDED' && task.completed_times > 1 && (
        <div className="text-right text-xs">
          {`Completed: ${task.completed_times} Gained ${task.rewards
            ?.map((reward) => `${reward?.reward_value * task.completed_times} ${reward?.reward_type.toLowerCase()}`)
            .join(', ')}`}
        </div>
      )}
    </div>
  )
}

function LockCard({ task }: { task: Codatta.Task.Task }) {
  return (
    <div className="mt-4 rounded-2xl bg-[#252532]">
      <div className="flex justify-between justify-items-start">
        <div className="flex gap-4 p-4 pb-3 text-center text-xs font-semibold leading-3">
          <LockBox />
        </div>
        <div
          className="box-border flex h-[61px] w-[227px] justify-end gap-1 bg-cover bg-right-top bg-no-repeat pr-1 pt-2"
          style={{ backgroundImage: `url(${cornerImage})` }}
        ></div>
      </div>
      <p className="px-4 text-base">{task.how_to_unlock}</p>
      <footer className="flex items-center justify-between gap-4 p-4 text-center text-sm font-semibold leading-8">
        <div className="flex-1"></div>
        <LockedButton />
      </footer>
    </div>
  )
}