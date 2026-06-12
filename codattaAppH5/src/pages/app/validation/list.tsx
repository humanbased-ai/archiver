import { List, PullRefresh ,Tabs} from 'react-vant'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@udecode/cn'

import PageHead from '@/components/page/page-head'
import TransitionEffect from '@/components/ui/transition-effect'
import ListItem from '@/components/page/app/validation/list/item'
import NoData from '@/components/ui/no-data'
import TgBackButton from '@/features/tg/components/back-button'

import { validationStoreActions, useValidationStore } from '@/store/validation.store'
import { useUserStore } from '@/store/user.store'

import Toast from '@/utils/toast'
import { TRACK_CATEGORY, trackEvent } from '@/utils/ga'
import { number } from '@telegram-apps/sdk'

type TValidationStatus = 'NotStart' | 'OnHold' | 'InProgress' | 'Completed'
const ValidationStatus: { label: string; value: TValidationStatus }[] = [
  { label: 'Not Start', value: 'NotStart' },
  { label: 'On Hold', value: 'OnHold' },
  { label: 'In Progress', value: 'InProgress' },
  { label: 'Completed', value: 'Completed' },
]

export function Component() {
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [filters, setFilters] = useState<Codatta.Validation.ListParams>({
    page: 1,
    page_size: 10,
    status: 'NotStart',
    stage: 2,
    network: '',
    category: '',
    entity: '',
    address: '',
    sort: 'ASC', // ASC DESC 
    type: 'Date', // Date
    decision: '',
    data_type: '',
    // task_type: "SUBMISSION_ONLY_IMAGE",
    // address:'0xa15c9d4aF12d42c612D5a7445d76f5cC3aC92A6'
  })
  const [ cardList, setCardList ] = useState<Codatta.Validation.ListItem[]>([])
  const { list, total } = useValidationStore()

  const navigate = useNavigate()
  const onBack = () => {
    navigate('/')
  }

  const hasMore = useMemo(() => {
    if(cardList.length === 0) {return false}
    return cardList.length < total
  }, [cardList, total])


  useEffect(() => {
    setCardList(list as Codatta.Validation.ListItem[])
  }, [list])


  async function getValidationList(params: Codatta.Validation.ListParams) {
    setLoading(true)
    Toast.loading('Loading...',{duration:0})
    try {
      await validationStoreActions.getValidationList(params)
      Toast.clear()
    } catch (err: any) {
      setCardList([])
      Toast.fail(err.message)
    }
    // Toast.clear()
    setLoading(false)
  }

  async function loadMoreValidation() {
    if (loading) return
    setLoading(true)
    try {
      await validationStoreActions.loadMore()
    } catch (err: any) {
      Toast.fail(err.message)
    }
    setLoading(false)
  }

  async function onRefresh() {
    setRefreshing(true)
    try {
      await validationStoreActions.getValidationList({ ...filters, page: 1 })
      Toast.success('Refresh successful')
    } catch (err: any) {
      Toast.fail(err.message)
    }
    setRefreshing(false)
  }

  useEffect(() => {
    getValidationList(filters)
  }, [filters])

  function handleSelectTab(tab:number) {
    trackEvent(TRACK_CATEGORY.VALIDATION_TAB_CLICK, { contentType: ValidationStatus[tab].label, extra: { filters, tab:ValidationStatus[tab].value } })
    setFilters({ ...filters, status: ValidationStatus[tab].value,page:1 })
  }

  return (
    <TransitionEffect className='h-full'>
      <TgBackButton visible={true} onClick={onBack} />
      <div className='bg-[#000000] flex flex-col h-full'>
        <div className="sticky top-0 z-10 flex-none flex flex-col ">
          {/* <PageHead title="Validation"></PageHead> */}
          <div className='rounded-t-3xl  bg-[#1c1c26] '>
              <Tabs 
              defaultActive='NotStart'
              background='transparent'
              titleActiveColor='#FFFFFF'
              color='#875DFF'
              lineWidth={96}
              lineHeight={1}
              onChange={(name)=>handleSelectTab(name as number)}
              >
                  {ValidationStatus.map((item) => (
                  <Tabs.TabPane key={item.value} title={item.label} disabled={loading} ></Tabs.TabPane>
                ))}
              </Tabs>
            </div>
          {/* <div className="sticky top-0 flex gap-1 p-4">
            {ValidationStatus.map((item) => (
              <button
                className={cn(
                  'flex-1 rounded-md border border-purple-800 px-1 py-2 text-xs text-white',
                  filters.status === item.value ? 'bg-primary' : 'bg-purple-900',
                )}
                onClick={() => handleSelectTab(item)}
                key={item.label}
              >
                {item.label}
              </button>
            ))}
          </div> */}
        </div>
        <div className="px-4 pb-4 flex-auto bg-[#1c1c26] overflow-auto ">
          <PullRefresh onRefresh={onRefresh} disabled={refreshing}>
            <List
              finished={!hasMore}
              onLoad={loadMoreValidation}
              loadingText={' '}
              finishedText={
                cardList.length > 0 ? (
                  'No more data'
                ) : (
                  <div className="flex h-[600px]  items-center justify-center">
                    <NoData text="No data found" />
                  </div>
                )
              }
            >
                {cardList?.map((item,index) => <ListItem item={item as Codatta.Validation.ListItem} key={`${item.submission_id}_${item.status}_${index}`} onRefresh={onRefresh}/>)}
            </List>
          </PullRefresh>
        </div>
      </div>
    </TransitionEffect>
  )
}
