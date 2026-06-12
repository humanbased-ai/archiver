import request from '@/utils/request'

// 查询参数列表
export function imageList(data) {
  return request({
    url: '/cytomine/imageinstance/list',
    method: 'post',
    data: data
  })
}

export function somaticMutationsList(data) {
  return request({
    url: '/cytomine/imageinstance/somaticMutationsList',
    method: 'post',
    data: data
  })
}

export function tagsList() {
  return request({
    url: 'tag.json?max=0&offset=0',
    method: 'get'
  })
}

export function wsiSearch(data) {
  return request({
    url: '/wsi/search',
    method: 'post',
    data: data,
    timeout: 60000
  })
}

export function changeMaskStatus(params){
  return request({
    url: '/cytomine/annotation/wsi/changeMaskStatus',
    method: 'get',
    params
  })
}

export function updateQuality(data){
  return request({
    url: '/cytomine/imageinstance/updateQuality',
    method: 'post',
    data
  })
}