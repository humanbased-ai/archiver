import { AxiosHeaders, type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { authStoreActions } from '@/store/auth.store'
import CryptoJS from 'crypto-js'


export const md5Interceptor = (config: InternalAxiosRequestConfig<any>) => {
  // 对请求进行md5加密
  const Timestamp = new Date().getTime()
  const salt = 'woshinibaba^***@113'
  const requestUrl = (config.baseURL || '') + config.url

  const Signature = CryptoJS.MD5(requestUrl + Timestamp + salt).toString()
  if (!config.headers) config.headers = new AxiosHeaders()
  config.headers['Signature'] = Signature
  config.headers['Timestamp'] = Timestamp
  return config
}

export const requestInterceptor = (config: InternalAxiosRequestConfig<any>) => {
  // 放在这里是表示，请求会自动带上，更新localstorage也会立即生效，不用update header
  if (!config.headers) config.headers = new AxiosHeaders()

  const authInfo = authStoreActions.getAuthStore()
  config.headers['token'] = authInfo.token
  config.headers['uid'] = authInfo.uid

  return config
}

export const responseInterceptor = (res: AxiosResponse) => {
  if (res.data.success) {
    return res.data
  } else {
    console.error('接口报错: ', res.data)
    if (res.data.errorCode === 1003) {
      // 这里直接清除token，跳转到根，剩下的逻辑由根来处理。
      authStoreActions.logout()
    }
    return Promise.reject(new Error(res.data?.errorMessage))
  }
}

export async function checkCloudflareValidation(error: AxiosError) {
  const headers = error.response?.headers

  if (
    error.response?.status === 403 &&
    /cloudflare/i.test((headers?.server as string) || '') &&
    /challenge/i.test(headers?.['cf-mitigated'] || '')
  ) {
    return location.reload()
  }

  return Promise.reject(error)
}
