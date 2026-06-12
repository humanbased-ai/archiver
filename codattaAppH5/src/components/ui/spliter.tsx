import { cn } from '@udecode/cn'

export default function Spliter(props: { children: React.ReactNode; className?: string }) {
  const { className } = props
  return (
    <div className="flex w-full items-center gap-3">
      <hr className={cn('flex-1 h-[1px] border-none bg-gray-800', className)} />
      {props.children}
      <hr className={cn('flex-1 h-[1px] border-none bg-gray-800', className)} />
    </div>
  )
}
