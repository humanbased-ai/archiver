import { AxiosInstance } from 'axios'
import request, { type Response } from './request'

enum Status {
  NotStart = 'NOTSTART',
  Pending = 'PENDING',
  Finished = 'FINISHED',
  Rewarded = 'REWARDED',
}

enum Type {
  Manual = 'MANUAL',
  Auto = 'AUTO',
}

interface Reward {
  reward_type: string
  reward_icon: string
  reward_value: number
}

interface Task {
  task_id: string
  name: string
  description: string
  type: Type
  expire_time?: number
  status: Status
  max_count?: number
  current_count?: number
  completed_times: number
  start_time?: number
  instance_id?: string
  ext_info: null
  schema: string
  rewards: Reward[]
  locked: boolean
  how_to_unlock: string
  refresh_time: number
  duration: number
}

interface VerifyResult {
  verify_result: 'PASSED' | 'FAILED'
  instance_id: Task['instance_id']
  rewards: Reward[]
  msg?: string
}

interface Quest {
  sub_cate_id: string
  sub_cate_name: string
  sub_cate_description: string
  help_info: { name: string; icon: string; link: string; content: string }[]
  tasks: Task[]
}

type RewardResult = Reward[]

class TaskApi {
  constructor(private request: AxiosInstance) {}
  async verify(taskId: string) {
    return this.request.post<Response<VerifyResult>>('/task/verify', { task_id: taskId }).then((res) => res.data)
  }

  async receiveReward(taskInstanceId: string) {
    return this.request
      .post<Response<RewardResult>>('/task/reward', { instance_id: taskInstanceId })
      .then((res) => res.data)
  }

  async finishTask(taskConfigId: string) {
    return this.request.post('/task/finish', { task_config_id: taskConfigId }).then((res) => res.data)
  }

  async getQuests() {
    const res = await this.request.post<Response<Quest>>('/task/sub_categories', { complete_platform: 'TMA' })
    return res.data
  }
}

export default new TaskApi(request)
