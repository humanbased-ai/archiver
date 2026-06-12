import { useEffect } from 'react'
import { useViewport } from '@/features/tg/hooks/use-viewport'

export const useVhPolyfill = () => {
  // 配合插件postcss-viewport-height-correction，修复vh在移动端上的适配问题
  const [viewPort] = useViewport()
  var customViewportCorrectionVariable = 'vh'

  useEffect(() => {
    function updateVh() {
      const height = viewPort?.stableHeight || viewPort?.height
      console.log('change:stableHeight', height, viewPort?.isStable, window.scrollY)
      if (!height) return

      const customVar = '--' + (customViewportCorrectionVariable || 'vh')
      document.documentElement.style.setProperty(customVar, height * 0.01 + 'px')

      // tg上窗口向上拉出安全区时，window.scrollY不为0，（iphone 12 scrollY为34），通过scrollTo将scrollY设为0，隐藏安全区
      // if (window.scrollY > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      // }
    }

    updateVh() // 首次计算
    viewPort?.on('change:stableHeight', updateVh)

    return () => {
      viewPort?.off('change:stableHeight', updateVh)
    }
  }, [viewPort])
}
