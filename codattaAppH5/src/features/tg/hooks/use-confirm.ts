// import { usePopup, OpenPopupOptionsButton } from '@tma.js/sdk-react'

// type TConfirmProps = {
//   title: string
//   message: string
//   confirmText?: string
//   confirm(): void
//   cancelText?: string
//   cancel?(): void
// }

// export function useConfirm() {
//   const popup = usePopup()

//   const open = (props: TConfirmProps) => {
//     const { title = '', message = '', confirmText = 'Ok', cancelText = 'Cancel', confirm, cancel } = props
//     const buttons: OpenPopupOptionsButton[] = [
//       {
//         id: 'ok',
//         type: 'destructive',
//         text: confirmText,
//       },
//     ]

//     if (cancelText) {
//       buttons.unshift({
//         id: 'cancel',
//         type: 'default',
//         text: cancelText,
//       })
//     }

//     return popup
//       .open({
//         title: title,
//         message: message,
//         buttons: buttons,
//       })
//       .then((buttonId) => () => {
//         buttonId === 'ok' ? confirm?.() : cancel?.()
//       })
//   }

//   return open
// }
