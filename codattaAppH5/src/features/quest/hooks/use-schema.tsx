import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

import { useUserStore } from '@/store/user.store'
import useSocialBind from '@/hooks/use-social-bind'
import useVerifyHook from './use-verify'
import Toast from '@/utils/toast'
import Dialog from '@/utils/dialog'
import { parseSchema } from '@/utils/schema'
import { TRACK_CATEGORY, trackEvent } from '@/utils/ga'
import { VITE_PC_APP_LINK } from '@/config'
import useOkxLink from '@/hooks/use-okx-wallet-link'
import taskApi from '@/api-v2/task.api'
import { taskStoreActions } from '@/store/task.store'

export default function useSchema(task: Codatta.Task.Task) {
  const navigate = useNavigate()
  const { loading: verifyLoading, verify } = useVerifyHook(task)
  const { handleSocialBind, loading: socialBindLoading } = useSocialBind(verify)
  const { info } = useUserStore()
  const { schema, task_id } = task

  const { handleLinkOkxWallet } = useOkxLink(task_id == 'SIGN-IN-WITH_OKX', handleLinkSuccess)
  const { isApp: isAppSchema, url, params: searchParams } = parseSchema(schema)

  const state = { ...searchParams, taskId: task_id }

  const xAccount = false //info?.social_account_info?.find((item) => item.channel === 'X')
  const discordAccount = false //info?.social_account_info?.find((item) => item.channel === 'Discord')
  const telegramAccount = false //info?.social_account_info?.find((item) => item.channel === 'Telegram')

  useEffect(() => {}, [])

  function handleLinkSuccess() {
    Toast.success('Link success')
  }

  const handleLinkClick = async () => {
    trackEvent(TRACK_CATEGORY.QUEST_GO, { extra: { schema } })

    try {
      if (task_id === 'BIND-X-AUTH' || (task_id === 'FOLLOW-X' && !xAccount)) {
        await handleSocialBind('X')
      } else if (task_id === 'BIND-TELEGRAM-AUTH' || (task_id === 'JOIN-TELEGRAM-TEAM' && !telegramAccount)) {
        await handleSocialBind('Telegram')
      } else if (task_id === 'BIND-DISCORD-AUTH' || (task_id === 'JOIN-DISCORD-TEAM' && !discordAccount)) {
        await handleSocialBind('Discord')
      } else if (task_id === 'DUAL-END-LOGIN' || task_id === 'MANTA-ASSET-CHECK') {
        Dialog.alert({
          title: 'Confirm',
          message: (
            <div>
              Please visit <span className="text-primary">{VITE_PC_APP_LINK}</span> on desktop to complete this quest
            </div>
          ),
        })
      } else if (task_id === 'SIGN-IN-WITH_OKX') {
        await handleLinkOkxWallet()
      } else {
        if (isAppSchema) {
          if (task_id === 'TSK2024053003') {
            // 连接钱包
            navigate(`/account/signin?redirect=${encodeURIComponent('/quest')}`, { state })
          } else {
            navigate(url, { state })
          }
        } else {
          window.open(url, '_blank')
        }
        // isAppSchema ? navigate(to, { state }) : window.open(to, '_blank')
        setTimeout(() => {
          if (task_id === 'OKX_GIVEAWAY') {
            taskApi.finishTask(task_id).then(() => {
              // 重新加载所有的quest
              taskStoreActions.getTasks()
            })
          }
        }, 0)
      }
    } catch (err: any) {
      Toast.fail(err.message)
    }
  }

  return { handleLinkClick, loading: socialBindLoading || verifyLoading }
}
