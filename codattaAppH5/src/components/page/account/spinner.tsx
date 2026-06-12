import React from "react"
import SpinnerSVG from '@/assets/images/spinner.svg'

export default function Spinner(props: { children: React.ReactNode, spinning?: boolean, gap?: number }) {
  const { children, spinning, gap } = props

  return <div className={`p-5 relative`} style={{padding: gap}}>
    {children}
    {spinning &&
      <div className="absolute top-0 right-0 w-1/2 h-1/2 animate-spin origin-bottom-left">
        <object data={SpinnerSVG} type="image/svg+xml"></object>
      </div>
    }
  </div>
}