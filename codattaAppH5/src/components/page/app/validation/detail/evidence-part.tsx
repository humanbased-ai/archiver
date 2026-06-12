import { Box, FileImage, Link, Type, Clock } from 'lucide-react'
import { ImagePreview } from 'react-vant'
import { cn } from '@udecode/cn'
import dayjs from 'dayjs'

import Copy from '@/components/ui/copy'
import Icon from '@/components/ui/svg-icon'

import { useUtils } from '@/features/tg/hooks/use-utils'
import { useEffect, useRef } from 'react'

export default function SubmissionEvidenceList(props: {
  evidences: Codatta.Validation.Evidence[]
  explorer: Codatta.Validation.Detail['explorer_link']
}) {
  const { evidences, explorer } = props

  return (
    <>{evidences?.map((evidence) => <EvidenceItem key={evidence.hash} evidence={evidence} explorer={explorer} />)}</>
  )
}

function EvidenceItem(props: {
  evidence: Codatta.Validation.Evidence
  explorer: Codatta.Validation.Detail['explorer_link']
}) {
  const { evidence, explorer } = props
  const [utils, _utilsError] = useUtils()
  const onClickHash = () => {
    const link =
      explorer?.base_link && `${explorer.base_link}${(explorer.hash_match ?? '').replace(/%s/, evidence.hash)}`

    link && utils.openLink(link, { tryInstantView: true })
  }

  const onClickLink = () => {
    const link = evidence.link
    utils.openLink(link, { tryInstantView: true })
  }

  return (
    <div className="py-3 text-xs">
      <div className="flex items-center gap-2 font-medium">
        <Clock size={12} />
        {dayjs(evidence.date).format('YYYY-MM-DD HH:mm')}
      </div>

      <div className="mt-2 rounded-lg bg-purple-900 p-3">
        <div className="flex items-center gap-1">
          <Box size={14} />
          <span className="text-sm font-medium tracking-tight">TxHash</span>
        </div>
        <div className="mt-1 flex items-center gap-6">
          <span className="flex-1 break-all text-primary" onClick={onClickHash}>
            {evidence.hash}
          </span>
          <Copy className="shrink-0" content={evidence.hash} />
        </div>
        <Divider />

        <div className="mt-3 flex items-center gap-1">
          <Type size={14} />
          <span className="text-sm font-medium tracking-tight">Text</span>
        </div>

        {evidence.translation && (
          <>
            <div className="my-1 font-medium">AI Translator:</div>
            <p className="break-words leading-5 text-gray-200">{evidence.translation}</p>
          </>
        )}
        <div className="mb-1 mt-3 font-medium">Original： </div>
        <p className="break-words leading-5 text-gray-200">{evidence.text}</p>
        <Divider className="mt-2" />

        {evidence.link && (
          <>
            <div className="mt-3 flex items-center gap-1">
              <Link size={14} />
              <span className="text-sm font-medium tracking-tight">Link</span>
            </div>
            <div className="mt-1 break-all text-primary" onClick={onClickLink}>
              {evidence.link}
            </div>
            <Divider />
          </>
        )}

        <div className="mb-2 mt-3 flex items-center gap-1">
          <FileImage size={14} />
          <span className="text-sm font-medium tracking-tight">Image</span>
        </div>
        <ImageList list={evidence.files} />
      </div>
    </div>
  )
}

function ImageList({ list }: { list: { filename: string; path: string }[] }) {
  const previewer = useRef<any>(null)

  const onClickImage = (index: number) => {
    previewer.current = ImagePreview.open({
      images: list.map((item) => item.path),
      startPosition: index,
      onClose: () => {
        previewer.current = null
        console.log('ImagePreview closed')
      },
    })
  }

  useEffect(() => {
    previewer.current?.destory()
  }, [])

  return (
    <div className="grid grid-cols-2 gap-2">
      {list?.map((imgUrl, index) => (
        <div
          className="relative flex aspect-[16/9] items-end justify-end rounded-[4px] bg-white bg-contain bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${imgUrl?.path ?? imgUrl})` }}
          onClick={() => onClickImage(index)}
          key={imgUrl.path}
        >
          <span className="mb-2 mr-2 rounded-[4px] bg-purple-800 p-[2px]">
            <Icon name="expand" className="h-4 w-4 text-white" />
          </span>
        </div>
      ))}
    </div>
  )
}

function Divider({ className }: { className?: string }) {
  return <div className={cn('mt-2 h-[1px] bg-purple-200 bg-opacity-50', className)}></div>
}
