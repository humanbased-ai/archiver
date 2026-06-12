import { message } from 'antd';

export default {
  success: (msg: string) => message.success(msg),
  fail: (msg: string) => message.success(msg),
  info: (msg: string) => message.success(msg),
  loading: (msg: string) => message.success(msg),
  clear: () => message.destroy(),
};
