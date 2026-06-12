import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@udecode/cn'

import TgBackButton from '@/features/tg/components/back-button'
import { useNavigateBack } from '@/hooks/use-navigate-back'
import { useTgStore } from '@/store/tg.store'

interface TTopLevelHeadProps {
  title?: string | React.ReactNode
  extra?: string | React.ReactNode
  visible?: boolean
  nativeBack?: boolean
  className?: string
  showBack?: boolean
  onBack?: () => void
}

/**
 * 优先使用tg header
 * @param className 在tg中无效
 * @param extra 在tg中无效
 * @returns
 */

export default function PageHead(props: TTopLevelHeadProps) {
  const { title = '', className, extra, visible = true, showBack = true, nativeBack = true, onBack } = props
  const [isTgError, setIsTgError] = useState<boolean>(false)
  const { isTg } = useTgStore()

  const back = useNavigateBack()
  const onClickBackBtn = onBack ?? back
  return (
    <>
      {isTg && !isTgError && nativeBack && showBack && (
        <TgBackButton onClick={onClickBackBtn} visible={visible} onError={() => setIsTgError(true)}></TgBackButton>
      )}
      {title && (
        <header
          className={cn(
            'sticky top-0 z-10 box-content flex h-[60px] w-full items-center justify-between gap-2 bg-gray-900',
            className,
          )}
        >
          {isTg && !isTgError && nativeBack ? (
            <div className="flex-1 text-center text-base font-semibold leading-10">{title}</div>
          ) : (
            // <TgBackButton onClick={onClickBackBtn} visible={visible} onError={() => setIsTgError(true)}>
            //   <div className="flex-1 text-center text-base font-semibold leading-10">{title}</div>
            // </TgBackButton>
            <>
              {showBack ? (
                <>
                  <TgBackButton visible={false} />
                  <div className={cn('flex-1 pl-3 text-left', !visible && 'invisible')}>
                    <ChevronLeft className="cursor-pointer text-inherit" onClick={onClickBackBtn} />
                  </div>
                </>
              ) : (
                <div className="flex-1"></div>
              )}
              <div className="flex-grow-0 text-center text-base font-semibold leading-10">{title}</div>
              <div className="flex-1">{extra}</div>
            </>
          )}
        </header>
      )}
    </>
  )
}
