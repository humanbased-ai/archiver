import taskApi from '@/api-v2/task.api'
import { proxy, useSnapshot } from 'valtio'

const taskStatusSort: Record<Codatta.Task.Status, number> = {
  FINISHED: 1,
  NOTSTART: 2,
  PENDING: 3,
  REWARDED: 4,
}

export interface TTaskStore {
  loading: boolean
  tasks: Codatta.Task.Task[]
  sortTasks: Codatta.Task.Task[]
  checkIn: {
    /**
     * 是否签到，true代表当天已经签到，false代表当天未签到
     */
    isCheckIn?: boolean
    /**
     * 签到天数
     */
    checkInDays: number
    /**
     * 发放的门票数
     */
    // issueTickerCount: number;
    /**
     * 发放的积分
     */
    // rewardValue: number;
  }
}

const taskStore = proxy<TTaskStore>({
  loading: false,
  tasks: [],
  checkIn: {
    isCheckIn: false,
    checkInDays: 0,
    // issueTickerCount: 0,
    // rewardValue: 0,
  },
  get sortTasks() {
    return this.tasks.sort((a: Codatta.Task.Task, b: Codatta.Task.Task) => {
      return taskStatusSort[a.status] - taskStatusSort[b.status]
    })
  },
})

async function getTasks() {
  try {
    taskStore.loading = true
    const res = await taskApi.getQuests()
    taskStore.tasks = res.data?.tasks ?? []
    taskStore.loading = false
    return res.data
  } catch (error: any) {
    console.error('getTasks', error?.message)
  }

  taskStore.loading = false
}

export function useTaskStore() {
  return useSnapshot(taskStore)
}

// check-in咨询
// export async function getCheckinInfo(): Promise<boolean> {
//   try {
//     const res = await taskApi.getCheckinInfo({ campaign_supplier: 'telegram' })
//     taskStore.checkIn.checkInDays = res.check_in_days || 0
//     taskStore.checkIn.isCheckIn = res.is_check_in

//     return true
//   } catch (e) {
//     return false
//   }
// }

// export async function checkin(data: { campaign_supplier: string }) {
//   try {
//     const res = await taskApi.updateCheckin(data)
//     return res
//   } catch (e) {
//     return false
//   }
// }

export const taskStoreActions = {
  getTasks,
  // getCheckinInfo,
}
