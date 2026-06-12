import request from './base'

class TaskApi {
  // getActivities() {
  //   return request.post<Codatta.Task.Acitivities>('/task/categories').then((res) => res.data)
  // }

  // @MockApi({ importData: () => import('@/api/mock/quest/sub_categories.json'), open: true })
  async getQuests(): Promise<Codatta.Task.Quest> {
    // sub_cate_id应该是tg专属的一个值
    return (
      request
        // .post<Codatta.Task.Activity>('/task/sub_categories', { sub_cate_id: 'SUBCATE005' })
        .post('/tg/task/sub_categories', { sub_cate_id: '' })
        .then((res) => res.data?.[0])
    )
  }

  async verify(taskId: string): Promise<Codatta.Task.VerifyResult> {
    // return request.post('/tg/task/verify', { task_id: taskId }).then((res) => res.data)
    return request.post('/task/verify', { task_id: taskId }).then((res) => res.data)
  }

  async receiveReward(taskInstanceId: string): Promise<Codatta.Task.RewardResult> {
    // return request.post('/tg/task/reward', { instance_id: taskInstanceId }).then((res) => res.data)
    return request.post('/task/reward', { instance_id: taskInstanceId }).then((res) => res.data)
  }

  // getQuestDetail(questId: string) {
  //   return request.post<any>('/quest/detail', { quest_id: questId }).then((res) => res.data)
  // }

  finishTask(taskConfigId: string) {
    return request.post('/task/finish', { task_config_id: taskConfigId }).then((res) => res.data)
  }

  async getCheckinInfo(): Promise<{ check_in_days: number; is_check_in: boolean }> {
    return request.post('/tg/check-in/consult', { campaign_supplier: 'telegram' }).then((res) => res.data)
  }

  async checkin(): Promise<{
    check_in_days: number
    reward_value: number
    issue_ticker_count: number
    // is_check_in: boolean
  }> {
    return request.post('/tg/check-in', { campaign_supplier: 'telegram' }).then((res) => res.data)
  }
}

export default new TaskApi()
