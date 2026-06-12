import { cn } from '@udecode/cn'
import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'

interface TProps {
  visible: boolean
  showCloseButton?: boolean
  maskClass?: string
  contentClass?: string
  children: React.ReactNode
  onClose?: () => void
  onMaskClick?: () => void
}

const Popup = ({ visible, showCloseButton, children, maskClass, contentClass, onClose, onMaskClick }: TProps) => {
  return !visible ? (
    <></>
  ) : (
    ReactDOM.createPortal(
      <div
        onClick={() => {
          onClose?.()
          onMaskClick?.()
        }}
        className={cn(
          'pointer-events-auto absolute inset-0 bottom-0 left-0 right-0 top-0 flex animate-fade touch-none items-center justify-center bg-[#0000008c] animate-duration-200',
          maskClass,
        )}
      >
        <div
          className={cn(
            'absolute bottom-0 box-border w-full animate-fade-up rounded-tl-3xl rounded-tr-3xl border-t-[1px] border-purple-700 bg-gray-800 p-6 pt-2 animate-duration-300',
            contentClass,
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
          {showCloseButton && (
            <button className="absolute right-3 top-3 text-white" onClick={() => onClose?.()}>
              Close
            </button>
          )}
        </div>
      </div>,
      document.getElementById('popup')!,
    )
  )
}

export default Popup
