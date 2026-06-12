import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { cn } from '@udecode/cn'

import Stopwatch from '@/assets/icons/svg/stopwatch.svg'
import CountDown from './countdown'

import NetworkIcon from '@/components/ui/network-icon'
import ShareModal from '@/components/ui/share-modal'
import Copy from '@/components/ui/copy'
import { Info } from 'lucide-react'
import {Image} from 'react-vant'

import { TRACK_CATEGORY, trackEvent } from '@/utils/ga'
import { ShortenAddress } from '@/utils/wallet-address'
import {TaskType} from '@/api/validation.api'
import type1 from '@/assets/images/validation/type-01.svg'
import type3 from '@/assets/images/validation/type-03.svg'
import type4 from '@/assets/images/validation/type-04.svg'
import queryString from 'query-string'

function RewardPoint(props: { point?: number; status: string; send_point?: number }) {
  const { point, status } = props
  const send_point = props.send_point || 0
  const showPoint = status === 'Completed' ? send_point : point
  return showPoint ? (
    <div
      className={cn(
        'flex items-center rounded-2xl bg-[#875DFF]/20 ml-2 h-[26px] flex-none px-2 py-[2px] text-primary',
        status === 'Completed' && send_point < 1 && 'bg-[#404049] text-[#77777D] ',
      )}
    >
      {showPoint} {showPoint > 1 ? 'Points' : 'Point'}
    </div>
  ) : null
}

export default function ValidationCard(props: { item: Codatta.Validation.ListItem, onRefresh?:()=>void}) {
  const { item } = props
  const navigate = useNavigate()
  const [shareInfo, setShareInfo] = useState<any>()

  function handleCardClick(item: Codatta.Validation.ListItem,isOld?:boolean) {
   const queryDataString = queryString.stringify({
    status: item.status,
    task_type: item.task_type,
    current_stage: item.current_stage,
   })
    const url = isOld ?  `/validation/${item.submission_id}/detail?${queryDataString}` :  `/validation/${item.submission_id}/detail-v2?${queryDataString}`
    navigate(url)

    trackEvent(TRACK_CATEGORY.VALIDATION_VIEW_DETAIL_CLICK, {
      extra: {
        status: item.status,
        category: item.category,
        entity: item.entity,
        network: item.network,
      },
    })
  }

  const showPoint = item.status === 'Completed' ? item.send_point : item.point

  const standbyImg = {
    [TaskType.SUBMISSION_PRIVATE]: type1,
    [TaskType.SUBMISSION_IMAGE_ADDRESS]: type3,
    [TaskType.SUBMISSION_IMAGE_ENTITY]: type4,
  }
  return (
    <>
      <div className="my-4  rounded-2xl transition-al cursor-pointer overflow-hidden border border-transparent bg-[#252532]">
       {/* 类型2-旧 */}
       {
       item.task_type === null && <div className="p-4">
        <div
         onClick={() => handleCardClick(item,true)}
          className="cursor-pointer">
          <div
            className={cn(
              'text-primary text-lg font-bold',
              item.status === 'Completed' && item.send_point < 1 && 'text-white',
            )}
          >
            {showPoint || 0} {showPoint > 1 ? 'Points' : 'Point'}
          </div>
          <div className="mt-[12px] gap-[6px] flex items-center text-sm">
            <NetworkIcon size={16} type={item.network} />
            {ShortenAddress(item.address)}
            {item.address && (
              <Copy className="w-[13px] text-#fff shrink-0 cursor-pointer" content={item.address} />
            )}
          </div>
          <div className="text-[#84828E] mt-[16px] text-xs">Category</div>
          <div className="gap-[6px] flex items-center truncate font-400 text-xs">
            {item.category}
            {item.category && (
              <Info size={13} className="cursor-pointer" />
            )}
          </div>
          <div className="text-[#84828E] mt-[12px] text-xs">Entity</div>
          <div className="flex items-center">
            <div className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-400 text-xs">
              {item.entity}
            </div>
          </div>
        </div>
      </div>
       }
       {/* 类型2-新 */}
        {
       item.task_type ===TaskType.SUBMISSION_HASH_ADDRESS && <div className="p-4">
       <div onClick={() => handleCardClick(item)} className="cursor-pointer">
         <div className="flex items-center justify-between ">
           <NetworkIcon size={40} type={item.network} />
           <div
             className={cn(
               'flex items-center rounded-2xl bg-[#875DFF]/20 h-[26px] px-2 py-[2px] text-primary  ',
               item.status === 'Completed' && item.send_point < 1 && 'bg-[#404049] text-[#77777D] ',
             )}
           >
             {showPoint || 0} {showPoint > 1 ? 'Points' : 'Point'}
           </div>
         </div>
         <div className="font-700 mt-2 text-base">Does the transaction hash include the address?</div>
         <div className="border-t-[1px] border-[#FFFFFF]/[0.12] mt-4  overflow-hidden pt-4">
           <div className="flex items-center text-sm">
             <div className="font-400 mr-2  text-[#FFFFFF]/50">Address:</div>
             <div className="flex flex-auto truncate">
                <NetworkIcon size={16} type={item.network} />
               {/* <Tooltip title={item.address}> */}
                 <div className="flex-auto truncate  ml-[6px]">{item.address}</div>
               {/* </Tooltip> */}
             </div>
           </div>
           {/* 先放着，后面可能要用 */}
           {/* <div className="mt-3 flex items-center">
             <div className="font-400 mr-2 text-xs text-[#FFFFFF]/50">TxHash:</div>
             <div className="flex-auto truncate ">
               <Tooltip title={data.address}>{ShortenAddress(data.address)}</Tooltip>
             </div>
           </div> */}
         </div>
       </div>
     </div>
       }
        {/* 类型1、3、4 */}
        {
       [
        TaskType.SUBMISSION_IMAGE_ADDRESS,
        TaskType.SUBMISSION_IMAGE_ENTITY,
        TaskType.SUBMISSION_PRIVATE,
      ].includes(item.task_type as TaskType) &&  <div className="p-4 pb-3"  onClick={() => handleCardClick(item)}>
       <div  className="rounded-xl  w-full overflow-hidden">
         <div className="  w-full    bg-[#1C1C26]">
           <Image
            // fit='contain'
             src={
               (item?.submission_evidence && JSON.parse(item?.submission_evidence)?.files?.[0]?.path) ||
               standbyImg[item?.task_type as keyof typeof standbyImg]
             }
             alt=""
           />
         </div>
       </div>
       <div className=" mb-4 mt-3 flex  ">
         <div className=" flex-auto font-700 mt-2 text-base">
           {/* Is the image sourced from third-party publicly available data？ */}
           {item.task_type === TaskType.SUBMISSION_PRIVATE &&
             'Is the image sourced from third-party publicly available data？'}
           {item.task_type === TaskType.SUBMISSION_IMAGE_ADDRESS &&
             'Is the image or description related to the address?'}
           {item.task_type === TaskType.SUBMISSION_IMAGE_ENTITY &&
             'Is the image or description related to the Entity?'}
         </div>
         <RewardPoint {...item} />
       </div>

       <div className="flex flex-wrap justify-between">
         {[TaskType.SUBMISSION_IMAGE_ADDRESS, TaskType.SUBMISSION_IMAGE_ENTITY].includes(item.task_type as TaskType) && (
           <div>
             <div className="gap-[6px] flex items-center text-sm">
               <NetworkIcon size={16} type={item.network} />
              {ShortenAddress(item.address, 10)}
               {item.address && (
                 <Copy className="w-[13px] text-[#fff] shrink-0 cursor-pointer" content={item.address} />
               )}
             </div>
           </div>
         )}
         {item.task_type === TaskType.SUBMISSION_IMAGE_ENTITY && (
           <div>
             <span className="text-[#84828E] mt-[12px] text-xs">Entity:</span>
             <span className="ml-[6px] text-sm">
               {/* <Tooltip title={item.entity}>{item.entity}</Tooltip> */}
               {item.entity}
             </span>
           </div>
         )}
       </div>
     </div>
       }
        {item.status === 'OnHold' && (
          <div className="flex h-[46px] items-center  justify-center gap-1 bg-[#404049] ">
            <Stopwatch size={24} />
            <CountDown onTimeout={()=>props.onRefresh?.()} gmt={item.gmt_expiration} className="font-600" />
          </div>
        )}
      </div>
      <ShareModal visible={!!shareInfo} shareInfo={shareInfo} onClose={() => setShareInfo(null)} />
    </>
  )
}
