import React, { useState, useEffect } from 'react'
import { Popup } from 'react-vant'
import ArrowLeft from '@/assets/images/ads/angle-left.svg'

export default function StakingVerification(props: { isVisible: boolean; callback: () => void; onClose: () => void }) {
  const { isVisible, callback, onClose } = props
  const [visible, setVisible] = useState(false)
  function onVerifyClick() {
    setVisible(false)
    callback()
  }
  function colsePopup() {
    setVisible(false)
    onClose()
  }
  useEffect(() => {
    setVisible(isVisible)
  }, [isVisible])

  return (
    <Popup
      className="rounded bg-[#252532] text-white"
      style={{ width: '90%' }}
      round
      visible={visible}
      onClose={() => setVisible(false)}
    >
      <div className="p-4 text-center text-sm leading-[22px]">
        <span>
          You have been selected as a user annotation verification user. According to the user agreement, if the
          verification is not completed, you will not be able to receive rewards. You may edit your submission before
          proceeding with the verification to ensure your benefits.
        </span>
        <div>
          <button
            className="mt-6 w-full rounded-full bg-primary p-3 text-sm font-semibold text-white"
            onClick={onVerifyClick}
          >
            Go Verify
          </button>
        </div>
        <div className="mt-4 flex items-center justify-center text-center" onClick={colsePopup}>
          <img src={ArrowLeft} className="h-4 w-4" alt="" />
          Back
        </div>
      </div>
    </Popup>
  )
}
