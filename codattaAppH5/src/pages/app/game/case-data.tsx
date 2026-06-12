import { cn } from '@udecode/cn'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import PageHead from '@/components/page/page-head'

import EvidencePart from '@/components/page/app/validation/detail/evidence-part'
import DataPart from '@/components/page/app/validation/detail/existing-data-part'
import SubmitterInfo from '@/components/page/app/validation/detail/submitter-info'

import NetworkIcon from '@/components/ui/network-icon'
import TransitionEffect from '@/components/ui/transition-effect'

import validationApi from '@/api/validation.api'
import Toast from '@/utils/toast'

export const Component = () => {
  const { submission_id } = useParams()

  const [detail, setDetail] = useState<Codatta.Validation.Detail>()
  const [tab, setTab] = useState<'1' | '2' | '3'>('1')
  const defaultTabClassName =
    "after:m-auto after:mt-[2px] after:block after:h-[2px] after:w-5 after:bg-transparent after:content-['']"
  const [evidences, setEvidences] = useState<Codatta.Validation.Evidence[]>([])
  const [existingData, setExistingData] = useState<Codatta.Validation.Detail['existing_data']>([])
  const [submitterInfo, setSubmitterInfo] = useState<Codatta.Validation.Detail['submitter_info']>()
  const [explorerLink, setExplorerLink] = useState<Codatta.Validation.Detail['explorer_link']>()

  async function getValidationDetail(submission_id: string) {
    Toast.loading('Loading...')
    try {
      const res = await validationApi.getDetail(submission_id)
      setDetail(res.data)

      setExistingData(res.data?.existing_data || [])
      setSubmitterInfo(res.data?.submitter_info)
      setExplorerLink(res.data?.explorer_link)

      const evidence = JSON.parse(res.data?.basic_info?.evidence || '[]')
      setEvidences(Array.isArray(evidence) ? evidence : [evidence])
    } catch (err: any) {
      Toast.fail(err.message)
    }
    Toast.clear()
  }

  useEffect(() => {
    submission_id && getValidationDetail(submission_id)
  }, [submission_id])

  return (
    <TransitionEffect className="box-border flex h-full flex-col pb-4">
      <PageHead title="" className="sticky top-0 w-full"></PageHead>
      <header className="border-b-solid border-b-[1px] border-b-purple-200 border-opacity-40 bg-purple-950 px-4 pb-4 pt-2">
        <div className="flex items-start">
          <h3 className="break-all text-base font-extrabold text-white">{detail?.basic_info.address || ''}</h3>
          <div className="ml-auto flex shrink-0 items-center gap-2 rounded-full border-2 border-purple-900 px-2">
            <NetworkIcon size={14} type={detail?.basic_info.network || ''} />
            <span className="text-white text-opacity-80">{detail?.basic_info.network || ''}</span>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-4 text-xs leading-5 tracking-tighter text-gray-200">
          <span className="col-span-1">Category:</span>
          <span className="col-span-3">{detail?.basic_info.category}</span>
          <span className="col-span-1">Entity:</span>
          <span className="col-span-3">{detail?.basic_info.entity}</span>
          <span className="col-span-1">Data Source:</span>
          <span className="col-span-3">{detail?.basic_info.source}</span>
        </div>
      </header>
      <article className="relative bg-[#010101]">
        <div className="px-4">
          <div className="sticky top-0 flex gap-5 bg-gray-900 py-4 text-sm tracking-tight text-gray-400">
            <span
              className={cn(defaultTabClassName, tab === '1' && 'text-primary after:bg-primary')}
              onTouchStart={() => setTab('1')}
            >
              Evidence
            </span>
            {existingData.length > 0 && (
              <span
                className={cn(defaultTabClassName, tab === '2' && 'text-primary after:bg-primary')}
                data-type="2"
                onTouchStart={() => setTab('2')}
              >
                Existing Data
              </span>
            )}
            {submitterInfo && (
              <span
                className={cn(defaultTabClassName, tab === '3' && 'text-primary after:bg-primary')}
                data-type="3"
                onTouchStart={() => setTab('3')}
              >
                Submitter Info
              </span>
            )}
          </div>
          {tab === '1' && <EvidencePart evidences={evidences} explorer={explorerLink!} />}
          {tab === '2' && detail?.existing_data.length && <DataPart data={existingData} />}
          {tab === '3' && submitterInfo && <SubmitterInfo info={submitterInfo} />}
        </div>
      </article>
    </TransitionEffect>
  )
}
