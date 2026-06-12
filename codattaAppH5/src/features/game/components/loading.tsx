import { LoaderCircle } from 'lucide-react'

import dataThrowingImage from '@/assets/images/home/data-throwing.png'
import knifeGameImage from '@/assets/images/home/knife-game.png'

export default function Loading() {
  return (
    <div className="absolute bottom-0 left-0 right-0 top-0 flex items-center justify-center bg-[#000000E5]">
      <div>
        <object data={dataThrowingImage} className="mx-auto h-7 object-cover" type="image/png"></object>
        <object data={knifeGameImage} className="mx-auto mt-1 h-[68px] w-auto object-cover" type="image/png"></object>

        <LoaderCircle size={32} className="mx-auto mt-4 animate-spin animate-infinite animate-ease-in-out" />
        <p className="mt-1 text-center text-sm font-bold leading-[22px]">Loading</p>
      </div>
    </div>
  )
}
