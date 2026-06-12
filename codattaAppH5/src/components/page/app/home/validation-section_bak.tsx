import { useNavigate } from 'react-router-dom'
import { Loader2 as Loader } from 'lucide-react'

import ValidationListItem from '@/components/page/app/validation/list/item'
import { GradientButton } from '@/components/ui/button'
import NoData from '@/components/ui/no-data'

import { useValidationStore, validationStoreActions } from '@/store/validation.store'
import { useRequest } from '@/hooks/use-request'
import { useEffect } from 'react'
import { TRACK_CATEGORY, trackEvent } from '@/utils/ga'

export default function ValidationSection() {
  const navigate = useNavigate()
  const { homeList } = useValidationStore()
  const { loading, fetch } = useRequest(validationStoreActions.loadFirstPage)

  function onViewmoreClick() {
    trackEvent(TRACK_CATEGORY.VALIDATION_VIEW_MORE_CLICK)
    navigate('/validation')
  }

  useEffect(() => {
    fetch()
  }, [])

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {!homeList.length && (
        <div className="flex h-[300px] items-center justify-center">
          {loading ? <Loader className="animate-spin"></Loader> : <NoData text="No data found" className="" />}
        </div>
      )}

      {homeList?.map((item) => {
        return <ValidationListItem item={item as Codatta.Validation.ListItem} key={item.submission_id} />
      })}

      <GradientButton onClick={onViewmoreClick} disabled={loading} className="sticker bottom-0">
        View More
      </GradientButton>
    </div>
  )
}
