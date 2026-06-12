import request from '@/utils/request'

// 查询数据集列表
export function listDataset(data) {
  return request({
    url: '/system/dataSet/dataSetList',
    method: 'post',
    data: data
  })
}

// 查询数据集详细
export function getDataset(data) {
  return request({
    url: '/system/dataSet/getDataSetById',
    method: 'post',
    data: data
  })
}

// 获取可选所有者
export function listSelectManager(data) {
  return request({
    url: '/system/dataSet/getSelectManagerList',
    method: 'post',
    data: data
  })
}

// 新增数据集
export function addDataset(data) {
  return request({
    url: '/system/dataSet/add',
    method: 'post',
    data: data
  })
}

// 修改数据集
export function updateDataset(data) {
  return request({
    url: '/system/dataSet/update',
    method: 'post',
    data: data
  })
}

// 删除数据集
export function delDataset(data) {
  return request({
    url: '/system/dataSet/delete',
    method: 'post',
    data: data
  })
}