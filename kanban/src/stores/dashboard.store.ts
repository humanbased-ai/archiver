import dashboardApi from '../apis/index'
import { proxy } from 'valtio'

type TDashboardStore = {
  dau: number
  total_sign_up: number
  total_submission: number
  mau: number
  last_dau: number
  last_day_new_signup: number
  last_day_submission: number
  update_time: string
}

export const dashboardStore = proxy<TDashboardStore>({
  dau: 0,
  total_sign_up: 0,
  total_submission: 0,
  mau: 0,
  last_dau: 0,
  last_day_new_signup: 0,
  last_day_submission: 0,
  update_time: '',
})

export async function getDashboardData() {
  try {
    const data = (await dashboardApi.getData()).data

    dashboardStore.dau = data.dau ?? 0
    dashboardStore.total_sign_up = data.total_sign_up ?? 0
    dashboardStore.total_submission = data.total_submission ?? 0
    dashboardStore.mau = data.mau ?? 0
    dashboardStore.last_dau = data.last_dau ?? 0
    dashboardStore.last_day_new_signup = data.last_day_new_signup ?? 0
    dashboardStore.last_day_submission = data.last_day_submission ?? 0
    dashboardStore.update_time = data.update_time ?? ''
  } catch (e: any) {
    console.error('getData', e?.message)
  }
}
