namespace Codatta.Task {
  enum Category {
    CompleteProfile = 'COMPELTE_PROFILE',
    Tutorial = 'TUTORIAL',
    Contribution = 'CONTRIBUTION',
  }

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

  interface Quest {
    sub_cate_id: string
    sub_cate_name: string
    sub_cate_description: string
    help_info: { name: string; icon: string; link: string; content: string }[]
    tasks: Task[]
  }

  type QuestSummary = Pick<Quest, 'sub_cate_id' | 'sub_cate_name' | 'sub_cate_description'> & {
    award_icon: string
    completed_count: number
    avatars: Codatta.User.Info['avatar_url'][]
    finished_count: number
    locked: boolean
    how_to_unlock: string
  }

  interface QuestGroup {
    cate_name: string
    cate_id: string
    cate_icon: string
    sub: QuestSummary[]
  }

  type Quests = QuestGroup[]

  interface VerifyResult {
    verify_result: 'PASSED' | 'FAILED'
    instance_id: Codatta.Task.Task['instance_id']
    rewards: Codatta.Task.Reward[]
    msg?: string
  }

  type RewardResult = Reward[]

  interface Notice {
    task_config_id: string
    task_id: string
    task_name: string
    biz_type: string
    category: string
    reward: Codatta.Task.Reward[]
  }

  //   interface FinishNoticeItem {
  //     task_config_id: string
  //     task_id: string
  //     task_name: string
  //     biz_type: string
  //     category: string
  //     reward: {
  //       type: string
  //       value: number
  //     }[]
  //   }
}
