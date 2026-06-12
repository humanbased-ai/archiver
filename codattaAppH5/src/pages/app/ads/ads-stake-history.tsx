import adsApi, { StakeType } from '@/api/ads.api'
import { useEffect, useState } from 'react'
import { Popup, Toast } from 'react-vant'
import { toUserFriendlyAddress } from '@tonconnect/ui-react'
import TonIconSvg from '@/assets/icons/svg/ton.svg'
import codattaIcon from '@/assets/images/ads/codatta-icon.png'
import usdtIcon from '@/assets/images/ads/usdt-icon.png'
import { Check, ChevronRight } from 'lucide-react'
import { cn } from '@udecode/cn'
import PageHead from '@/components/page/page-head'

const stakeTypeList = [
  { text: 'USDT', value: StakeType.TON_USDT, icon: usdtIcon },
  { text: 'Codatta points', value: StakeType.POINT, icon: codattaIcon },
]

function SelectOption(props: {
  selected: boolean
  text: string
  icon: string
  key: string | number
  onSelected: (key: string | number) => void
}) {
  const { selected, text, key, onSelected, icon } = props

  return (
    <div
      className="flex items-center gap-2 border-b border-b-white border-opacity-10 px-6 py-4 text-sm last:border-b-0"
      onClick={() => onSelected(key)}
    >
      <img src={icon} className="h-6 w-6" alt="" />
      <span>{text}</span>
      <div
        className={cn(
          'ml-auto flex h-5 w-5 items-center justify-center rounded-full border border-white bg-transparent transition-all',
          selected ? 'bg-white' : '',
        )}
      >
        <Check size={12} className={cn('text-transparent', selected ? 'text-[#252532]' : '')}></Check>
      </div>
    </div>
  )
}

export function Component() {
  const [assetsType, setAssetsType] = useState<'ton_usdt' | 'codatta'>('ton_usdt')
  const [stakeItem, setStakeItem] = useState<Codatta.Ads.AdsStakeTypeItem>(stakeTypeList[0])
  const [showStakeType, setShowStakeType] = useState(false)
  const [lastItemId, setLastItemId] = useState<number>()
  const [totalValue, setTotalValue] = useState(0)
  const [historyList, setHistoryList] = useState<Codatta.Ads.AdsStakingHistoryItem[]>([])
  const [isLastPage, setIsLastPage] = useState<boolean>(false)

  function handleCoinTypeSelect(item: { text: string; value: string; icon: string }) {
    const assetsType = item.value === StakeType.TON_USDT ? 'ton_usdt' : 'codatta'
    setAssetsType(assetsType)
    setShowStakeType(false)

    const stakeType = stakeTypeList.find((type) => type.value === item.value)
    setStakeItem(stakeType!)
    setIsLastPage(false)
  }

  async function getStakingHistory(assetsType: 'ton_usdt' | 'codatta', lastId?: number) {
    try {
      Toast.loading({ message: 'Loading...', duration: 0 })
      const res = await adsApi.getStakeHistory({
        page_size: 10,
        last_id: lastId,
        asset_type: assetsType,
      })
      const icon = assetsType == 'codatta' ? codattaIcon : usdtIcon
      setHistoryList(res.top_earns.map((item) => Object.assign(item, { icon })))
      const total = assetsType === 'ton_usdt' ? res.total_staking_amount : res.total_staking_points
      setTotalValue(total)
      if (res.top_earns.length === 0) {
        setIsLastPage(true)
      } else {
        setLastItemId(res.top_earns[res.top_earns.length - 1]?.id)
      }
      Toast.clear()
    } catch (err: any) {
      Toast.fail(err.message)
    }
  }

  function getTonFriendlyAddress(address: string) {
    try {
      const friendlyAddress = toUserFriendlyAddress(address)
      console.log(friendlyAddress)
      const start = friendlyAddress.slice(0, 4)
      const end = friendlyAddress.slice(-4)
      return `${start}...${end}`
    } catch (err: any) {
      console.log(err)
      return address
    }
  }

  async function handleViewMore() {
    try {
      Toast.loading({ message: 'Loading...', duration: 0 })
      const res = await adsApi.getStakeHistory({
        page_size: 10,
        last_id: lastItemId,
        asset_type: assetsType,
      })
      const icon = assetsType == 'codatta' ? codattaIcon : usdtIcon
      const pageList = res.top_earns.map((item) => Object.assign(item, { icon }))
      setHistoryList([...historyList, ...pageList])
      // setLastItemId(res.top_earns[res.top_earns.length - 1]?.id)
      if (res.top_earns.length === 0) {
        setIsLastPage(true)
      } else {
        setLastItemId(res.top_earns[res.top_earns.length - 1]?.id)
      }
      Toast.clear()
    } catch (err: any) {
      Toast.fail(err.message)
    }
  }

  useEffect(() => {
    getStakingHistory(assetsType)
  }, [])

  useEffect(() => {
    getStakingHistory(assetsType)
  }, [assetsType])

  return (
    <>
      <PageHead title="Previous Staking History"></PageHead>
      <div className="p-4">
        <h1 className="mb-2 text-base font-bold">Previous Staking History</h1>
        <p className="mb-4 text-sm text-[#8D8D93]">
          Staking as confidence is Codatta’s universal concept, allowing users to gain more rewards while maintaining
          anonymity.
        </p>

        <div className="rounded-2xl border border-white border-opacity-15 bg-[#252532] p-4">
          <h2 className="mb-2 text-sm">Total Staking Amount</h2>
          <div
            className="mb-4 flex items-center gap-2 rounded-xl border border-white border-opacity-10 bg-transparent p-3"
            onClick={() => setShowStakeType(true)}
          >
            <img src={stakeItem.icon} alt="" className="h-6 w-6 rounded-full" />
            <span className="text-sm">{totalValue}</span>
            <ChevronRight className="ml-auto" />
          </div>

          <div>
            <p className="mb-1 text-sm">Historical Earnings Display</p>
            <div className="mb-2 flex items-center justify-between border-b border-white border-opacity-10 py-2 text-xs text-white text-opacity-40">
              <span>Address</span>
              <span>Earning</span>
            </div>
            <div className="text-xs">
              <table className="w-full">
                <tbody>
                  {historyList.map((item) => {
                    console.log(item.staking_network === 'TON_USDT')
                    return (
                      <tr key={item.id}>
                        <td className="w-[88%] break-all py-3 align-middle">
                          {item.staking_network === 'TON_USDT'
                            ? getTonFriendlyAddress(item.staking_address)
                            : item.staking_address}
                        </td>
                        <td className="w-[12%] pr-1 text-right align-middle">
                          <img src={item.icon} alt="" className="inline-block aspect-1 w-[18px]" />
                        </td>
                        <td className="text-left align-middle">{item.total_amount.toFixed(2)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="py-6 text-center text-sm" onClick={handleViewMore}>
          {isLastPage ? 'You have reached the end. There are no more items to display.' : 'View more Records'}
        </div>

        <Popup
          className="rounded-t-3xl bg-[#252532] text-white"
          position="bottom"
          visible={showStakeType}
          onClose={() => setShowStakeType(false)}
        >
          <div className="text-white">
            {stakeTypeList?.map((item) => {
              return (
                <SelectOption
                  icon={item.icon}
                  key={item.value}
                  text={item.text}
                  selected={stakeItem.value === item.value}
                  onSelected={() => handleCoinTypeSelect(item)}
                ></SelectOption>
              )
            })}
          </div>
        </Popup>
      </div>
    </>
  )
}
