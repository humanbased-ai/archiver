import arrowShare from '@/assets/images/ads/arrow-share.png'

export default function PageHeadShare(props: {onClickShare: () => void}) {
  return (
    <div className='w-6 h-6 text-right float-right mr-4' onClick={props.onClickShare}>
      <img src={arrowShare} alt="share" />
    </div>
  )
}