import request from '@/utils/request'

// 查询案例列表
export function listCaseInfo(data) {
  return request({
    url: '/system/caseInfo/list',
    method: 'post',
    data: data
  })
}

// 查询案例分页
export function pageCaseInfo(data) {
  return request({
    url: '/system/caseInfo/casePage',
    method: 'post',
    data: data
  })
}

// 查询案例详细
export function getCaseInfo(data) {
  return request({
    url: '/system/caseInfo/getCaseInfoById',
    method: 'post',
    data: data
  })
}

// 新增案例
export function addCaseInfo(data) {
  return request({
    url: '/system/caseInfo/add',
    method: 'post',
    data: data
  })
}

// 修改案例
export function updateCaseInfo(data) {
  return request({
    url: '/system/caseInfo/update',
    method: 'post',
    data: data
  })
}

// 删除案例
export function delCaseInfo(data) {
  return request({
    url: '/system/caseInfo/delete',
    method: 'post',
    data: data
  })
}

// 删除案例
export function resetCase(data) {
  return request({
    url: '/system/caseInfo/resetCase',
    method: 'post',
    data: data
  })
}

export function delImageInstance(data) {
  return request({
    url: '/system/caseInfo/deleteImageInstance',
    method: 'post',
    data: data
  })
}

