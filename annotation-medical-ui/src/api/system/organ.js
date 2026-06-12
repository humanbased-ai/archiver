import request from '@/utils/request'

// 查询器官列表
export function listOrgan(data) {
  return request({
    url: '/system/organ/organList',
    method: 'post',
    data: data
  })
}

// 查询器官详细
export function getOrgan(data) {
  return request({
    url: '/system/organ/getOrganById',
    method: 'post',
    data: data
  })
}

// 新增器官
export function addOrgan(data) {
  return request({
    url: '/system/organ/add',
    method: 'post',
    data: data
  })
}

// 修改器官
export function updateOrgan(data) {
  return request({
    url: '/system/organ/update',
    method: 'post',
    data: data
  })
}

// 删除器官
export function delOrgan(data) {
  return request({
    url: '/system/organ/delete',
    method: 'post',
    data: data
  })
}

// 添加标签
export function addTag(data) {
  return request({
    url: '/system/organ/addTag',
    method: 'post',
    data: data
  })
}

// 删除标签
export function deleteTag(data) {
  return request({
    url: '/system/organ/deleteTag',
    method: 'post',
    data: data
  })
}

// 查询标签
export function tagList(data) {
  return request({
    url: '/system/organ/tagList',
    method: 'post',
    data: data
  })
}

// 添加标签
export function addAreaTag(data) {
  return request({
    url: '/system/organ/addAreaTag',
    method: 'post',
    data: data
  })
}

// 删除标签
export function deleteAreaTag(data) {
  return request({
    url: '/system/organ/deleteAreaTag',
    method: 'post',
    data: data
  })
}

// 查询标签
export function areaTagList(data) {
  return request({
    url: '/system/organ/areaTagList',
    method: 'post',
    data: data
  })
}