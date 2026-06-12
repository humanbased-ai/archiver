import { BorderButton, GradientButton } from '@/components/ui/button'

export default function Section() {
  return (
    <>
      <div className="h-[92px]"></div>
      <div className="absolute bottom-0 left-0 grid h-[92px] w-full grid-cols-2 items-center gap-2 bg-purple-800 px-4">
        <BorderButton className="h-[44px] text-base">Submit Later</BorderButton>
        <GradientButton className="h-[44px] text-base">Submit</GradientButton>
      </div>
    </>
  )
}
