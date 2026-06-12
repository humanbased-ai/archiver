import axios from 'axios'
import { VITE_IS_DEV_MODE } from '@/config'
import { responseInterceptor, requestInterceptor, md5Interceptor } from './interceptor'

const request = axios.create({
  baseURL: '/api',
})

request.interceptors.request.use(md5Interceptor)
request.interceptors.request.use(requestInterceptor)
request.interceptors.response.use(responseInterceptor)

export default request

/**
 * api mock数据装饰器
 * 提供mock数据的必要条件：1.是开发模式；2.mock文件路径存在；3.开关已打卡
 */
export const MockApi = ({ importData, open }: { importData: () => Promise<any>; open: boolean }) => {
  return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      if (VITE_IS_DEV_MODE && importData && open) {
        const res = await importData()
        return res.data
      }

      return originalMethod.apply(this, args)
    }

    return descriptor
  }
}

// updateHeader()

// export function updateHeader() {
//   const Token = localStorage.getItem('token')
//   const UID = localStorage.getItem('uid')

//   if (Token) {
//     Object.assign(request.defaults.headers.common, { Token, UID })
//   } else {
//     delete request.defaults.headers.common['Token']
//     delete request.defaults.headers.common['UID']
//   }
// }
