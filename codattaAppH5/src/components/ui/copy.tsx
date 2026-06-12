import { cn } from '@udecode/cn'
import { Copy } from 'lucide-react'
import { useState } from 'react'

import Toast from '@/utils/toast'


import copyToClipboard from '@/utils/copy-to-clipboard'

export default function MyCopy(props: { content?: string;size?:number, className?: string, onCopied?: () => void }) {
  const [copied, setCopied,] = useState(false)
  const { onCopied ,size=14} = props

  function handleClick(e: MouseEvent) {
    e.stopPropagation()
    console.log(props.content)

    try {
      props.content && copyToClipboard(props.content)
      Toast.info('Copied!')
      onCopied?.()
    } catch (e: any) {
      console.error('copy error: ', e.message)
    }
    // 注：ip地址navigator.clipboard为空，localhost正常
  }

  return (
    <div className={cn('relative cursor-pointer text-nowrap text-xs font-medium leading-3', props?.className)} onClick={(e) => handleClick(e as unknown as MouseEvent)}>
      <Copy size={size}  className={copied ? 'invisible' : ''} />
      <span className={cn('absolute left-0 top-0', !copied ? 'invisible' : '')}>Copied!</span>
    </div>
  )
}
