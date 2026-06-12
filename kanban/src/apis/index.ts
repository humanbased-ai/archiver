import { get } from './base'

interface Response<T> {
  data: T
  success: boolean
  errorCode: number
  errorMessage: string
}

type TData = {
  dau: number
  total_sign_up: number
  total_submission: number
  mau: number
  last_dau: number
  last_day_new_signup: number
  last_day_submission: number
  update_time: string
}

class DashboardApi {
  async getData(): Promise<Response<TData>> {
    return get('api/dashboard/v2')
  }
}

export default new DashboardApi()
