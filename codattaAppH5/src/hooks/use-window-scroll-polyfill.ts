import { useEffect } from 'react'
import { debounce } from '@/utils'

export const useWindowScrollPolyfill = () => {
  useEffect(() => {
    function onScroll(e: { preventDefault: () => void }) {
      e.preventDefault()
      console.log('onScroll', window.scrollY)
      // iphone 12 scrollY为34
      // if (window.scrollY > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      // }
    }

    const debouncedOnScroll = debounce(onScroll, 400)

    window.addEventListener('scroll', debouncedOnScroll)

    return () => {
      window.removeEventListener('scroll', debouncedOnScroll)
    }
  }, [])
}
