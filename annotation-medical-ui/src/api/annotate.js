import request from '@/utils/request'

// 获取路由
export const organList = () => {
  return request({
    url: '/organ/organList',
    method: 'post'
  })
}

export const dataSetList = (data) => {
    return request({
      url: '/dataset/dataSetList',
      method: 'post',
      data
    })
  }

export const caseList = (data) => {
  return request({
    url: '/caseinfo/caseList',
    method: 'post',
    data
  })
}

export const casePage = (data) => {
  return request({
    url: '/caseinfo/casePage',
    method: 'post',
    data
  })
}

// //dataset/getDataSet  id
export const getDataSetDetail = (data) => {
  return request({
    url: '/dataset/getDataSet',
    method: 'post',
    data
  })
}

///basic/sysUser/getUserProtocol
export const getUserProtocol = () => {
  return request({
    url: '/basic/sysUser/getUserProtocol',
    method: 'post'
  })
}

///basic/sysUser/confirmUserProtocol
export const confirmUserProtocol = () => {
  return request({
    url: '/basic/sysUser/confirmUserProtocol',
    method: 'post'
  })
}

