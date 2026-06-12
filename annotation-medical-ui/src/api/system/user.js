import request from '@/utils/request'
import { parseStrEmpty } from "@/utils/ruoyi";

// 查询用户列表
export function listUser(query) {
  return request({
    url: '/basic/sysUser/list',
    method: 'get',
    params: query
  })
}

// 查询用户详细
export function getUser(userId) {
  return request({
    url: '/basic/sysUser/getUser/' + parseStrEmpty(userId),
    method: 'get'
  })
}

// 新增用户
export function addUser(data) {
  return request({
    url: '/basic/sysUser/add',
    method: 'post',
    data: data
  })
}

// 修改用户
export function updateUser(data) {
  return request({
    url: '/basic/sysUser/update',
    method: 'post',
    data: data
  })
}

// 删除用户
export function delUser(id) {
  return request({
    url: '/basic/sysUser/del',
    method: 'post',
    params:{id}
  })
}

// 用户密码重置
export function resetUserPwd(id, psw) {
  const data = {
    id,
    psw
  }
  return request({
    url: '/basic/sysUser/updatePsw',
    method: 'post',
    params: data
  })
}

// 用户状态修改
export function changeUserStatus(id, status) {
  const data = {
    id,
    status
  }
  return request({
    url: '/basic/sysUser/changeStatus',
    method: 'post',
    params: data
  })
}

// 认证状态修改
export function changeUserAuthStatus(id, authStatus) {
  const data = {
    id,
    authStatus
  }
  return request({
    url: '/basic/sysUser/changeAuthStatus',
    method: 'post',
    params: data
  })
}

// 查询用户个人信息
export function getUserProfile() {
  return request({
    url: '/system/user/profile',
    method: 'get'
  })
}

// 修改用户个人信息
export function updateUserProfile(data) {
  return request({
    url: '/system/user/profile',
    method: 'put',
    data: data
  })
}

// 用户密码重置
export function updateUserPwd(oldPassword, newPassword) {
  const data = {
    oldPassword,
    newPassword
  }
  return request({
    url: '/basic/sysUser/updatePwd',
    method: 'post',
    params: data
  })
}

// 用户头像上传
export function uploadAvatar(data) {
  return request({
    url: '/system/user/profile/avatar',
    method: 'post',
    data: data
  })
}

// 查询授权角色
export function getAuthRole(userId) {
  return request({
    url: '/system/user/authRole/' + userId,
    method: 'get'
  })
}

// 保存授权角色
export function updateAuthRole(data) {
  return request({
    url: '/system/user/authRole',
    method: 'put',
    params: data
  })
}

export function setLanguage(data){
  return request({
    url: '/basic/sysUser/setLanguage',
    method: 'post',
    params: data
  })
}

export function getUserInfo(){
  return request({
    url: '/system/login/getUserInfo',
    method: 'get'
  })
}

///index/subspecialtyList
export function getSubspecialtyList(){
  return request({
    url: '/index/subspecialtyList',
    method: 'post',
    data: {}
  })
}

