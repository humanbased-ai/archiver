import boxBg from '@/assets/images/quest/box.svg'
import lockBoxBg from '@/assets/images/quest/lock-box.png'

export function Box({ icon, num }: { icon: string; num: number }) {
  return (
    <div className="h-10 w-10 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${boxBg})` }}>
      <div
        className="flex h-full w-full items-end justify-end bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${icon})`, backgroundSize: '24px auto' }}
      >
        <div className="m-[1px] flex h-3 items-center justify-center rounded-br-[5px] rounded-tl-[5px] bg-[#5734BB] px-[2px]">
          <span className="origin-center scale-[0.7] text-xs font-bold">{num}</span>
        </div>
      </div>
    </div>
  )
}

export function LockBox() {
  return (
    <div className="h-10 w-10 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${lockBoxBg})` }}></div>
  )
}
