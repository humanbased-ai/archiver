import { cn } from '@udecode/cn'

import EmptyImage from '@/assets/images/common/empty.svg'

export default function NoData({ text = 'No Data', className }: { text?: string; className?: string }) {
  return (
    <div className={cn('text-center text-sm text-gray-400', className)}>
      <img src={EmptyImage} alt="" className="m-auto block w-12" />
      <p className="mt-3">{text}</p>
    </div>
  )
}
