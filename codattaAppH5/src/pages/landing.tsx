import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { parseSchema, urlSafeDecode } from '@/utils/schema'
import { useTgStore } from '@/store/tg.store'
import { Loader2 } from 'lucide-react'
import { useUtils } from '@/features/tg/hooks/use-utils'
import cookies from 'js-cookie'
import { TRACK_CATEGORY, trackEvent } from '@/utils/ga'
/**
 *
 * @returns
 * examples:
 *  1. localhost:5175/m/landing?tgWebAppStartParam=YXBwOi8vdmFsaWRhdGlvbi9TTTIwMjQwNjE0MDYwOTA5Mzc5NS9zdWJtaXQ_YT0xJmI9Mg#tgWebAppData=user%3D%257B%2522id%2522%253A6868088893%252C%2522first_name%2522%253A%2522Mackey%2522%252C%2522last_name%2522%253A%2522%2522%252C%2522username%2522%253A%2522Yaya_007ma%2522%252C%2522language_code%2522%253A%2522en%2522%252C%2522allows_write_to_pm%2522%253Atrue%257D%26chat_instance%3D-849526732228562893%26chat_type%3Dprivate%26start_param%3DYXBwOi8vdmFsaWRhdGlvbi9TTTIwMjQwNjE0MDYwOTA5Mzc5NS9zdWJtaXQ_YT0xJmI9Mg%26auth_date%3D1720090936%26hash%3D8ad3055ebf14441f77bfa77a51bfc9210152f562b07eba0357bf067cbc95165e&tgWebAppVersion=7.4&tgWebAppPlatform=weba&tgWebAppThemeParams=%7B"bg_color"%3A"%23212121"%2C"text_color"%3A"%23ffffff"%2C"hint_color"%3A"%23aaaaaa"%2C"link_color"%3A"%238774e1"%2C"button_color"%3A"%238774e1"%2C"button_text_color"%3A"%23ffffff"%2C"secondary_bg_color"%3A"%230f0f0f"%2C"header_bg_color"%3A"%23212121"%2C"accent_text_color"%3A"%238774e1"%2C"section_bg_color"%3A"%23212121"%2C"section_header_text_color"%3A"%23aaaaaa"%2C"subtitle_text_color"%3A"%23aaaaaa"%2C"destructive_text_color"%3A"%23e53935"%7D
 *  其中tgWebappStartParam参数通过urlSafeEncode('app://validation/SM202406140609093795/submit?a=1&b=2')加密获得
 *  2. localhost:5175/m/landing?tgWebAppStartParam=YXBwOi8vcXVlc3Q#tgWebAppData=user%3D%257B%2522id%2522%253A6868088893%252C%2522first_name%2522%253A%2522Mackey%2522%252C%2522last_name%2522%253A%2522%2522%252C%2522username%2522%253A%2522Yaya_007ma%2522%252C%2522language_code%2522%253A%2522en%2522%252C%2522allows_write_to_pm%2522%253Atrue%257D%26chat_instance%3D-849526732228562893%26chat_type%3Dprivate%26start_param%3DYXBwOi8vcXVlc3Q%26auth_date%3D1720090936%26hash%3D8ad3055ebf14441f77bfa77a51bfc9210152f562b07eba0357bf067cbc95165e&tgWebAppVersion=7.4&tgWebAppPlatform=weba&tgWebAppThemeParams=%7B"bg_color"%3A"%23212121"%2C"text_color"%3A"%23ffffff"%2C"hint_color"%3A"%23aaaaaa"%2C"link_color"%3A"%238774e1"%2C"button_color"%3A"%238774e1"%2C"button_text_color"%3A"%23ffffff"%2C"secondary_bg_color"%3A"%230f0f0f"%2C"header_bg_color"%3A"%23212121"%2C"accent_text_color"%3A"%238774e1"%2C"section_bg_color"%3A"%23212121"%2C"section_header_text_color"%3A"%23aaaaaa"%2C"subtitle_text_color"%3A"%23aaaaaa"%2C"destructive_text_color"%3A"%23e53935"%7D
 *  其中tgWebappStartParam参数通过urlSafeEncode('app://quest')加密获得
 */

export function Component() {
  const { startParam } = useTgStore()
  const navigate = useNavigate()

  useEffect(() => {
    try {
      const param = urlSafeDecode(startParam)
      const { isApp, isUrl, params, path, url } = parseSchema(param || 'tma://')
      console.log('parseSchema', startParam, { isApp, path, url, params })

      if (params?.['_ch']) {
        cookies.set('_ch', params._ch)
        trackEvent(TRACK_CATEGORY.LANDING_CHANNEL, { extra: { channel: params._ch, url } })
        console.log('set channel:', params._ch)
      }

      if (isApp) {
        console.log(url)
        navigate(url, { replace: true, state: params })
      }

      const [utils] = useUtils()

      if (isUrl) {
        utils.openLink(url, { tryInstantView: true })
      }
    } catch (e) {
      console.error('', e)
    }
  }, [startParam, navigate])

  return (
    <div className="">
      <div className="flex h-[66vh] flex-col items-center justify-center">
        <Loader2 className="mb-2 animate-spin"></Loader2>
        <span>Loading...</span>
      </div>
    </div>
  )
}
