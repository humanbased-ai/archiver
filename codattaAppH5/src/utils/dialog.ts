import { Dialog } from 'react-vant'
import { DialogProps } from 'react-vant/es/dialog/PropsType'

export default {
  confirm(props: DialogProps) {
    return Dialog.confirm({ confirmButtonText: 'Ok', cancelButtonText: 'Cancel', ...props })
  },
  alert(props: DialogProps) {
    return Dialog.alert({ confirmButtonText: 'Ok', cancelButtonText: 'Cancel', ...props })
  },
  info(props: DialogProps) {
    return Dialog.show({ confirmButtonText: 'Ok', cancelButtonText: 'Cancel', ...props })
  },
}
