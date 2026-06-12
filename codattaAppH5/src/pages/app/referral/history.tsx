import { List, PullRefresh } from 'react-vant'
import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'

import EmptyImage from '@/assets/images/common/empty.svg'

import PageHead from '@/components/page/page-head'
import TransitionEffect from '@/components/ui/transition-effect'

import userApi from '@/api/user.api'
import Toast from '@/utils/toast'

function RewardItem(props: { item: any }) {
  const { item } = props
  return (
    <div className="flex items-center rounded-md bg-purple-950 p-3">
      <div>
        <div className="mb-1 text-sm">{item.address || item.email}</div>
        <div className="text-xs text-gray-500">{dayjs(item.date).format('YYYY-MM-DD')}</div>
      </div>
      <div
        className="ml-auto rounded-full px-2 py-1 font-bold"
        style={{ background: 'linear-gradient(90deg, #340B5D 0%, #570F9E 100%)' }}
      >
        {item.reward} Points
      </div>
    </div>
  )
}

function NoData() {
  return (
    <div className="text-center">
      <div className="flex aspect-[1/1] items-center justify-center rounded-full bg-[rgba(255,255,255,0.05)] p-6">
        <img src={EmptyImage} alt="" className="w-12" />
      </div>
      <p>No Data</p>
    </div>
  )
}

export function Component() {
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [list, setList] = useState<any>([])
  const [total, setTotal] = useState(0)
  const [pagination, setPagination] = useState({ page: 1, page_size: 10 })

  const hasMore = useMemo(() => {
    return list.length < total
  }, [list, total])

  useEffect(() => {
    getRewards({ page: 1, page_size: 10 })
  }, [])

  async function getRewards(params: { page: number; page_size: number }) {
    setLoading(true)
    Toast.loading('Loading...')
    try {
      const res = await userApi.getInviteRecords(params)
      setList(res.result)
      setTotal(res.total_count)
    } catch (err: any) {
      Toast.fail(err.message)
    }
    Toast.clear()
    setLoading(false)
  }

  async function loadMoreRewards() {
    if (loading) return
    setLoading(true)
    try {
      const pageInfo = { ...pagination, page: pagination.page + 1 }
      const res = await userApi.getInviteRecords(pageInfo)
      setList([...list, ...res.result])
      setTotal(res.total_count)
      setPagination(pageInfo)
    } catch (err: any) {
      Toast.fail(err.message)
    }
    setLoading(false)
  }

  async function onRefresh() {
    setRefreshing(true)
    try {
      const res = await userApi.getInviteRecords({ page: 1, page_size: 10 })
      setList(res.result)
      setTotal(res.total_count)
      setPagination({ page: 1, page_size: 10 })
      Toast.success('Refresh successful')
    } catch (err: any) {
      Toast.fail(err.message)
    }
    setRefreshing(false)
  }

  return (
    <TransitionEffect className="px-4 pb-4">
      <div className="sticky top-0 z-10 mb-2">
        <PageHead title="Invite Reward History" className="w-full"></PageHead>
      </div>
      <PullRefresh onRefresh={onRefresh}>
        <List
          finished={!hasMore}
          onLoad={loadMoreRewards}
          finishedText={list.length > 0 ? 'No more data' : <NoData />}
          loadingText={' '}
        >
          {list?.map((item: any) => <RewardItem key={item.id} item={item}></RewardItem>)}
        </List>
      </PullRefresh>
    </TransitionEffect>
  )
}
