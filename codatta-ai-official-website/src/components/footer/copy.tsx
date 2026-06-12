import { cn } from '@udecode/cn'
import bigLogo from '@/assets/home/codatta_logo_big.png'

export default function Copy({ className }: { className?: string }) {
  return (
    <>
      <p className={cn("text-center lg:text-sm lg:tracking-wide", className)}>
        © 2025 - Codatta Inc. All Rights Reserved.
      </p>
      <img src={bigLogo} className="w-full h-auto mt-[47px] lg:mt-[200px]" />
    </>
  );
}
