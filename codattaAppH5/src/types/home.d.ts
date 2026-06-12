namespace Codatta.Home {
  type UnlockFunctionType = 'VALIDATION' | 'SUBMISSION' | 'BOUNTY_HUNTING'

  interface Info {
    account_info: {
      user_id: string
      status: string
      total_ticker_count: number
      avatar_url: string
      username: string
      contribution: number
      reputation: number
      roles: string
      code: string
      inviter_code: string
      unlocked_functions: UnlockFunctionType[]
    }
    check_in_info: {
      is_check_in: boolean
      // check_in_days: number
    }
    finished_task_count: number
  }
}
