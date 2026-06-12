import { Toast } from 'react-vant'
import { ToastProps } from 'react-vant/es/toast/PropsType'

export default {
  success: (message: string, options?: ToastProps) =>
    Toast.success({ message, duration: options?.duration || 2500, ...options, className: 'toast-success' }),
  fail: (message: string, options?: ToastProps) =>
    Toast.fail({ message, duration: options?.duration || 2500, ...options, className: 'toast-fail' }),
  info: (message: string, options?: ToastProps) =>
    Toast.info({ message, ...options, duration: options?.duration || 2500 }),
  loading: (message: string, options?: ToastProps) =>
    Toast.loading({ message, duration: options?.duration || 2500, ...options }),
  clear: () => Toast.clear(),
}
