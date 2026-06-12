import { cn } from '@udecode/cn'

import { NormalButton } from '@/components/ui/button'

import useVerifyHook from '../hooks/use-verify'
import useSchema from '../hooks/use-schema'
import useReward from '../hooks/use-reward'
import { TRACK_CATEGORY, trackEvent } from '@/utils/ga'

const BaseButton: React.FC<{
  disabled?: boolean
  loading?: boolean
  children: React.ReactNode
  className?: string
  onClick?: () => void
}> = ({ disabled, loading, children, className, onClick }) => {
  return (
    <NormalButton
      disabled={disabled}
      loading={loading}
      onClick={onClick}
      className={cn(
        'h-8 flex-1 bg-white text-base font-medium leading-8 text-gray-900',
        disabled ? 'bg-gray-300 font-normal' : className,
      )}
    >
      {children}
    </NormalButton>
  )
}

type TaskButtonProps = { task: Codatta.Task.Task }
export const LockedButton: React.FC = () => {
  return <BaseButton disabled={true}>Complete</BaseButton>
}

export const VerifyButton: React.FC<TaskButtonProps> = ({ task }) => {
  const { loading, verify } = useVerifyHook(task)

  function onVerifyClick() {
    verify()
    trackEvent(TRACK_CATEGORY.QUEST_VERIFY_CLICK)
  }

  return (
    <BaseButton disabled={loading || task.locked} loading={loading} onClick={onVerifyClick}>
      Verify
    </BaseButton>
  )
}

export const SchemaButton: React.FC<TaskButtonProps> = ({ task }) => {
  const { handleLinkClick } = useSchema(task)

  function onCompleteClick() {
    handleLinkClick()
    trackEvent(TRACK_CATEGORY.QUEST_COMPLET_CLICK, { extra: { task_id: task.task_id } })
  }

  return <BaseButton onClick={onCompleteClick} className='bg-primary text-white'>Complete</BaseButton>
}

export const ReceiveRewardButton: React.FC<TaskButtonProps> = ({ task }) => {
  const { handleReceiveReward } = useReward(task)

  function onReceiveRewardClick() {
    handleReceiveReward()
    trackEvent(TRACK_CATEGORY.QUEST_REWARD_CLICK, { extra: { task_id: task.task_id } })
  }

  return (
    <BaseButton onClick={onReceiveRewardClick} className="bg-gradient-1 text-white">
      Claim
    </BaseButton>
  )
}

export const FinishedButton: React.FC = () => {
  return <BaseButton disabled={true} className='bg-white bg-opacity-10'>Gained Reward</BaseButton>
}

export const buttons: Record<Codatta.Task.Type, Record<Codatta.Task.Status, React.FC<TaskButtonProps>[]>> = {
  AUTO: {
    NOTSTART: [],
    PENDING: [SchemaButton],
    FINISHED: [ReceiveRewardButton],
    REWARDED: [FinishedButton],
  },
  MANUAL: {
    NOTSTART: [],
    PENDING: [VerifyButton, SchemaButton],
    FINISHED: [],
    REWARDED: [FinishedButton],
  },
}
