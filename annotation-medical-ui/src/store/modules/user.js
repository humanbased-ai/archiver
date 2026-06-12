import { login, logout, getInfo } from '@/api/login'
import { getToken, setToken, removeToken,setStrageToken,copyToken } from '@/utils/auth'

const user = {
  state: {
    token: getToken(),
    name: '',
    avatar: '',
    id: "",
    roles: [],
    permissions: [],
    language:'en',
    authStatus: 0,
    skillLevel: undefined,
  },

  mutations: {
    SET_TOKEN: (state, token) => {
      state.token = token
    },
    SET_NAME: (state, name) => {
      state.name = name
    },
    SET_AVATAR: (state, avatar) => {
      state.avatar = avatar
    },
    SET_ROLES: (state, roles) => {
      state.roles = roles
    },
    SET_PERMISSIONS: (state, permissions) => {
      state.permissions = permissions
    },
    SET_ID: (state, id) => {
      state.id = id
    },
    SET_LANGUAGE: (state, language)=>{
      state.language = language
    },
    SET_AUTHSTATUS: (state, authStatus) => {
      state.authStatus = authStatus
    },
    SET_SKILLLEVEL: (state, skillLevel) => {
      state.skillLevel = skillLevel
    },
  },

  actions: {
    // 登录
    Login({ commit }, userInfo) {
      const email = userInfo.email.trim()
      const code = userInfo.code
      return new Promise((resolve, reject) => {
        login(email, code).then(res => {
          setToken(res)
          if(userInfo.rememberMe){
            setStrageToken(res)
          } 
          commit('SET_TOKEN', res)
          resolve()
        }).catch(error => {
          reject(error)
        })
      })
    },

    // 获取用户信息
    GetInfo({ commit, state }) {
      return new Promise((resolve, reject) => {
        getInfo().then(res => {
          const user = res.user
          const avatar = (user.avatar == "" || user.avatar == null) ? require("@/assets/images/user_avatar.jpg") : user.avatar;
          if (res.roles && res.roles.length > 0) { // 验证返回的roles是否是一个非空数组
            commit('SET_ROLES', res.roles)
            commit('SET_PERMISSIONS', res.permissions)
          } else {
            commit('SET_ROLES', ['ROLE_DEFAULT'])
          }
          commit('SET_NAME', user.userName)
          commit('SET_AVATAR', avatar)
          commit('SET_ID', user.id)
          commit('SET_LANGUAGE',user.language)
          commit('SET_AUTHSTATUS', user.authStatus)
          commit('SET_SKILLLEVEL', user.skillLevel)
          resolve(res)
        }).catch(error => {
          reject(error)
        })
      })
    },

    // 退出系统
    LogOut({ commit, state }) {
      return new Promise((resolve, reject) => {
        logout(state.token).then(() => {
          commit('SET_TOKEN', '')
          commit('SET_ROLES', [])
          commit('SET_PERMISSIONS', [])
          removeToken()
          resolve()
        }).catch(error => {
          reject(error)
        })
      })
    },

    // 前端 登出
    FedLogOut({ commit }) {
      return new Promise(resolve => {
        commit('SET_TOKEN', '')
        removeToken()
        resolve()
      })
    },

    ChangeLanguage({ commit },language){
      commit("SET_LANGUAGE",language)
    }
  }
}

export default user
