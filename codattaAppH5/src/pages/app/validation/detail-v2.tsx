// import { cn } from '@udecode/cn'
// import { Popup } from 'react-vant'  // 修改这里的导入
import { useEffect, useState,useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import PageHead from '@/components/page/page-head'
import Copy from '@/components/ui/copy'
import TgBackButton from '@/features/tg/components/back-button'

// import { 
//   BorderButton,
//    NormalButton } from '@/components/ui/button'
import NetworkIcon from '@/components/ui/network-icon'
import TransitionEffect from '@/components/ui/transition-effect'

import validationApi from '@/api/validation.api'
import { TRACK_CATEGORY, trackEvent } from '@/utils/ga'
import Toast from '@/utils/toast'
import {TaskType} from '@/api/validation.api'

import { ImagePreview ,Image,Swiper,Form,Radio,Input,Space,Button} from 'react-vant'
import type { SwiperInstance } from 'react-vant';
import { LoaderCircle } from 'lucide-react'
import { cn } from '@udecode/cn'

import AngleRightCircle from '@/assets/icons/svg/angle-right-circle.svg'
import AngleLeftCircle from '@/assets/icons/svg/angle-left-circle.svg'
import type1 from '@/assets/images/validation/type-01.svg'
import type3 from '@/assets/images/validation/type-03.svg'
import type4 from '@/assets/images/validation/type-04.svg'
// import { fa } from '@faker-js/faker'

type TStatus = 'NotStart' | 'OnHold' | 'InProgress' | 'Completed'

const standbyImg = {
  [TaskType.SUBMISSION_PRIVATE]: type1,
  [TaskType.SUBMISSION_IMAGE_ADDRESS]: type3,
  [TaskType.SUBMISSION_IMAGE_ENTITY]: type4,
}
export const Component = () => {
  const { submission_id } = useParams()
  const [search] = useSearchParams()
  const [form] = Form.useForm()

  const decision = Form.useWatch('decision', form)
  const [detail, setDetail] = useState<Codatta.Validation.Detail>()
  const [tab, setTab] = useState<'1' | '2' | '3'>('1')
  const defaultTabClassName =
    "after:m-auto after:mt-[2px] after:block after:h-[2px] after:w-5 after:bg-transparent after:content-['']"
  const [evidences, setEvidences] = useState<Codatta.Validation.Evidence[]>([])
  const [existingData, setExistingData] = useState<Codatta.Validation.Detail['existing_data']>([])
  const [submitterInfo, setSubmitterInfo] = useState<Codatta.Validation.Detail['submitter_info']>()
  const [explorerLink, setExplorerLink] = useState<Codatta.Validation.Detail['explorer_link']>()
  const [showAction, setShowAction] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [status, setStatus] = useState<TStatus>((search.get('status') as TStatus) || 'NotStart')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const onBack = () => {
    navigate('/validation')
  }
  const task_type = search.get('task_type') 
  const current_stage = search.get('current_stage')
  console.log('current_stage',typeof current_stage,{current_stage},)

  async function getValidationDetail(submission_id: string,task_type?:string,current_stage?:string ) {
    Toast.loading('Loading...')
    try {
      const res = await validationApi.getDetail(submission_id,task_type,current_stage)
      setDetail(res.data)

      setExistingData(res.data?.existing_data || [])
      setSubmitterInfo(res.data?.submitter_info)
      setExplorerLink(res.data?.explorer_link)

      const evidence = JSON.parse(res.data?.basic_info?.evidence || '[]')
      setEvidences(Array.isArray(evidence) ? evidence : [evidence])
      if (!['NotStart', 'OnHold'].includes(status)) {
        // TODO: 这里同样需要确认后端的逻辑是否正确。
        // 这里在修改过ORM后，似乎结构有变化了。这里从原来的string变化为了object，
        let reason
        if (typeof res.data.decision?.reason === 'object') {
          reason = res.data.decision?.reason
        }
        if (typeof res.data.decision?.reason === 'string') {
          try {
            reason = JSON.parse(res.data.decision?.reason)
          } catch (err: any) {
            reason = {}
          }
        }

        form.setFieldsValue({
          decision: 'APPROVE',
          reason,
        })
      }
    } catch (err: any) {
      Toast.fail(err.message)
    }
    Toast.clear()
  }

  // function handleValidationFinish() {
  //   getValidationDetail(submission_id as string,task_type)
  //   setShowAction(false)
  // }

  async function onAcceptTask() {
    setAccepting(true)
    try {
      trackEvent(TRACK_CATEGORY.VALIDATION_ACCEPT_CLICK, { extra: { submission_id } })

      const res = await validationApi.hold(submission_id!, 2,task_type || undefined)
      Toast.success('Accept Success!')

      setStatus('OnHold')
      getValidationDetail(submission_id!,task_type || undefined,current_stage || undefined)
    } catch (err: any) {
      Toast.fail(err.message)
    }
    setAccepting(false)
  }

 async function onValidate() {
    trackEvent(TRACK_CATEGORY.VALIDATION_VALIDATE_CLICK)
    // navigate(`/validation/${submission_id}/validate`)
    if(loading) return
    setLoading(true)
    try {
      trackEvent(TRACK_CATEGORY.VALIDATION_SUBMIT_CLICK, { extra: { submission_id, action: decision } })
    const value = await form.getFieldsValue()
      validationApi.validate({
        submission_id,
        task_type,
       ...value
      }).then((res)=>{
        Toast.success('Submit success').clear()
    navigate(`/validation`)

      }).catch((err)=>{
      Toast.fail(err.message || 'Exception occurred! please try again.')
      
    })
      // onFinish?.()
    } catch (err: any) {
      Toast.fail(err.message || 'Exception occurred! please try again.')
    }
    setLoading(false)
  }

  useEffect(() => {
    submission_id && getValidationDetail(submission_id,task_type || undefined,current_stage || undefined)
  }, [submission_id])

  const type =task_type
  const evidence = detail?.basic_info?.evidence ? JSON.parse(detail?.basic_info?.evidence) : {}
  const showPoint = status === 'Completed' ? detail?.decision?.send_point : detail?.point || 0
  
  return (
    <TransitionEffect className="box-border flex h-full flex-col pb-4 bg-[#1C1C26]">
      <TgBackButton visible={true} onClick={onBack} />
      {/* <PageHead title="Validation" className="sticky top-0"></PageHead> */}
      <div className='p-4 overflow-auto '>
            {[
              TaskType.SUBMISSION_PRIVATE,
              TaskType.SUBMISSION_IMAGE_ADDRESS,
              TaskType.SUBMISSION_IMAGE_ENTITY,
            ].includes(type as TaskType) && (
              <div className='mb-6'>
                  {detail?.basic_info?.evidence && JSON.parse(detail?.basic_info?.evidence)?.files?.[0] ? (
                    <Imgs files={JSON.parse(detail?.basic_info?.evidence)?.files} />
                  ) : (
                  <div className='rounded-xl overflow-hidden'>
                    {detail?.task_type && <Image  src={standbyImg[detail?.task_type as keyof typeof standbyImg]} alt="" />}
                    </div>
                  )}
                </div>
            )}
            <div className="mb-6">
              {status !== 'OnHold' && <div className="rounded-2xl bg-[#875DFF]/20 my-[2px] mb-2 inline-block  h-7 px-3 align-middle text-primary">
                <div className="flex h-full w-full items-center">
                  {showPoint || 0} {showPoint as number > 1 ? 'Points' : 'Point'}
                </div>
              </div>}
              {/* 类型1 */}
              {type === TaskType.SUBMISSION_PRIVATE && (
                <div className="font-700 text-lg">Is the image sourced from third-party publicly available data？</div>
              )}
              {/* 类型2 */}
              {type === TaskType.SUBMISSION_HASH_ADDRESS && (
                <div className="font-700 text-lg">Does the address have any historical transaction data?</div>
              )}
              {/* 类型3 */}
              {type === TaskType.SUBMISSION_IMAGE_ADDRESS && (
                <div className="font-700 text-lg">Is the image or description related to the address?</div>
              )}
              {/* 类型4 */}
              {type === TaskType.SUBMISSION_IMAGE_ENTITY && (
                <div className="font-700 text-lg">Is the image or description related to the entity?</div>
              )}
            </div>
            {/* Description */}
            {[TaskType.SUBMISSION_IMAGE_ADDRESS, TaskType.SUBMISSION_IMAGE_ENTITY].includes(type as TaskType) &&
              evidence && (
                <div className="mb-4 text-gray-400  text-sm">
                  <div className='flex '>
                    <div className="leading-4">Description:</div>
                    <div className="leading-4 ml-2">
                      {evidence.translation && evidence.translation.trim() !== evidence.text?.trim() && (
                        <>
                          <div>AI Translator:</div>
                          <pre className="text-wrap break-all">{evidence.translation}</pre>
                          <div className="mt-4">Original:</div>
                        </>
                      )}
                      <pre className="text-wrap break-all">{evidence.text}</pre>
                    </div>
                  </div>
                </div>
              )}
            {/* Address */}
            {[TaskType.SUBMISSION_HASH_ADDRESS, TaskType.SUBMISSION_IMAGE_ADDRESS].includes(type as TaskType) && (
              <div className="gap-[6px] my-2  text-sm mb-6">
                <span className="text-[#84828E]">Address:</span>
                <div className='flex items-center'>
                  <div >
                {detail?.basic_info?.network && <NetworkIcon size={22} type={detail?.basic_info?.network} />}
                  </div>
                  
                <a href={detail?.explorer_link?.address_link} target="_blank" className="break-all ml-2 mr-6">
                  {detail?.basic_info?.address}
                </a>

                {detail?.basic_info?.address && (
                  <Copy
                    content={detail?.basic_info?.address}
                    size={22}
                    />
                )}
                </div>
              </div>
            )}
            {/* TxHash */}
            {/* {type === 2 && (
            <div className="gap-6px flex items-center text-sm">
              <span className="text-#84828E">TxHash:</span>
              <div className="flex flex-auto justify-between">
                0x4e261974a3ba43d601e5b6acbb37c04c952def18ac0e926d1ef13ecb77925cf7
                <Copy
                  size={13}
                  className="w-13px text-#fff shrink-0 cursor-pointer"
                  content={'0x12cF08eb6d78858251Bf8D8a5C344209Bc280e73'}
                />
              </div>
            </div>
          )} */}
            {type === TaskType.SUBMISSION_IMAGE_ENTITY && (
              <div className='mb-6'>
                <span className="text-#84828E mt-12px">Entity: </span>
                <span className="ml-3 ml-[6px] text-sm">{detail?.basic_info?.entity}</span>
              </div>
            )}
            <Form form={form}>
            <div className="flex justify-between mb-4">
              <div className="font-600 text-sm">Action *</div>
              <div>
                <Form.Item name="decision"  noStyle disabled={!['NotStart', 'OnHold'].includes(status)||loading}>
                  <Radio.Group >
                      <Space>
                        <Radio name="REJECT"  checkedColor="#D355FF">Reject</Radio>
                        <Radio name="APPROVE"  checkedColor="#D355FF">Approve</Radio>
                      </Space>
                  </Radio.Group>
                </Form.Item>
              </div>
            </div>
             {decision && <div  >
                <Form.Item name={['reason', 'text']} noStyle disabled={loading}>
                 <Input.TextArea
                    maxLength={10000}
                    readOnly={!['NotStart', 'OnHold'].includes(status)}
                    rows={3} autoSize 
                    placeholder={!['NotStart', 'OnHold'].includes(status)? undefined : "Please provide reasons for your decison."}
                  />
                </Form.Item>
              </div>}
          </Form>
          </div>
         
      {submission_id && <div className="sticky bottom-0 mt-auto w-full max-w-[480px] py-2 px-4">
        <div className="flex gap-3 items-center">
          {['NotStart'].includes(status) && (
            <div  className="flex-none  text-sm" onClick={onAcceptTask}>
              Accept the task
            </div>
          )}
          {['NotStart', 'OnHold'].includes(status) && (
               <Button
               className={cn(!decision ? 'bg-purple-900 text-opacity-40 text-white' : 'bg-purple-500  text-white', 'flex-1  py-2 text-sm  h-[44px]  font-normal')}
               disabled={!decision}
               round
               onClick={onValidate}
             >
              Submit
               {loading && <LoaderCircle className="ml-8 m-auto inline origin-center animate-spin text-inherit absolute" />}
             </Button>
          )}
        </div>
      </div>}

      {/* <Popup
        visible={showAction}
        position="bottom"
        closeOnClickOverlay
        onClose={() => setShowAction(false)}
        style={{
          backgroundColor: '#010101',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          border: '1px solid #491B77',
          borderBottom: 'none',
          padding: '16px',
          color: '#fff',
          boxSizing: 'border-box',
        }}
      >
        <ValidationAction
          submissionId={submission_id!}
          onFinish={handleValidationFinish}
          onClose={() => setShowAction(false)}
        />
      </Popup> */}
    </TransitionEffect>
  )
}


interface ImageInt {
  path:string,
  [key:string]:any
}

const Imgs = ({files}:{files:ImageInt[]}) => {
  const swipeRef = useRef<SwiperInstance>(null);
  const [index, setIndex] = useState(1)
  const previewer = useRef<any>(null)

  const onClickImage = () => {
    previewer.current = ImagePreview.open({
      images: files.map((item) => item.path),
      startPosition: index-1,
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
    <div className="relative  h-full w-full  ">
      {index !== 1 && (
        <div
          className="btnstyle  absolute left-3 top-[50%] z-10  -translate-y-[50%] cursor-pointer"
          onClick={() => {
            swipeRef?.current?.swipePrev()
          }}
        >
          <AngleLeftCircle size={26} />
        </div>
      )}
      {index !== files.length && (
        <div
          className="btnstyle  absolute right-3 top-[50%] z-10  -translate-y-[50%] cursor-pointer"
          onClick={() => {
            swipeRef?.current?.swipeNext()
          }}
        >
          <AngleRightCircle size={26} />
        </div>
      )}
      <div className='w-full h-[240px] rounded-2xl overflow-hidden bg-[#252532] '>
       <Swiper 
       ref={swipeRef}
       loop
       indicator={false}
       onChange={(current) => {
        setIndex(Number(current) + 1)
      }}
      autoplay={2000}
       >
          {files?.map((image) => (
            <Swiper.Item key={image.path}>
              <div className='w-full h-[240px]' onClick={onClickImage}>
               <Image lazyload src={image.path} fit='contain' className="h-full w-full" />
              </div>
            </Swiper.Item>
          ))}
        </Swiper>
      </div>

    </div>
  )
}