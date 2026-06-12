import validationApi from '@/api/validation.api'
import { proxy, useSnapshot } from 'valtio'

export interface ValidationStore {
  homeList: Codatta.Validation.ListItem[]
  list: Codatta.Validation.ListItem[]
  total: number
}

const validationStore = proxy<ValidationStore>({
  homeList: [],
  list: [],
  total: 0,
})

const defaultParams: Codatta.Validation.ListParams = {
  page: 1,
  page_size: 10,
  status: 'NotStart',
  stage: 2,
  network: '',
  category: '',
  entity: '',
  address: '',
  sort: 'ASC', // ASC DESC
  type: 'Date', // Date Point
  decision: '',
  data_type: '',
}

let tempParams: Codatta.Validation.ListParams = { ...defaultParams }

async function getValidationList(filter: Codatta.Validation.ListParams) {
  tempParams = filter
  const data = await validationApi.getList(filter)
  validationStore.list = data.data
  validationStore.total = data.total_count

  if (data.data.length == 0) {
    validationStore.total = 0
  }
  return data
}

async function loadMore() {
  tempParams.page! += 1
  const data = await validationApi.getList(tempParams)
  validationStore.total = data.total_count
  validationStore.list.push(...data.data)

  // 防止后端total计算错误
  if (data.data.length == 0) {
    validationStore.total = validationStore.list.length
  }
}

async function loadFirstPage() {
  const data = await validationApi.getList({ ...defaultParams, page_size: 2 })
  validationStore.homeList = data.data

  return data.data
}

export const validationStoreActions = {
  getValidationList,
  loadMore,
  loadFirstPage,
}

export function useValidationStore() {
  return useSnapshot(validationStore)
}
