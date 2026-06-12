import request from '@/utils/request'

// 查询参数列表
export function tagList(data) {
  console.log(data)
  return request({
    url: '/tagList',
    method: 'post',
    data: data
  })
}

export function addTag(data) {
  return request({
    url: 'tag.json',
    method: 'post',
    data: data
  })
}

export function deleteTag(id) {
  return request({
    url: 'tag.json?id=' + id,
    method: 'delete',
  })
}

export function updateTag(data) {
  return request({
    url: 'tag.json',
    method: 'put',
    data: data
  })
}