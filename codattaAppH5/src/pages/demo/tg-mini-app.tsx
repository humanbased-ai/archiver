import { Radio, Input } from 'react-vant'
import { useEffect, useState } from 'react'

import Card from '@/components/ui/card'
import Copy from '@/components/ui/copy'

import { useTgStore } from '@/store/tg.store'
import { parseSchema, urlSafeEncode } from '@/utils/schema'

const p = parseSchema(
  `app://landing?tgWebAppStartParam=222#tgWebAppData=user%3D%257B%2522id%2522%253A6868088893%252C%2522first_name%2522%253A%2522Mackey%2522%252C%2522last_name%2522%253A%2522%2522%252C%2522username%2522%253A%2522Yaya_007ma%2522%252C%2522language_code%2522%253A%2522zh-hans%2522%252C%2522allows_write_to_pm%2522%253Atrue%257D%26chat_instance%3D4701672718142718505%26chat_type%3Dsender%26start_param%3Djjj%26auth_date%3D1720152543%26hash%3D3ec02c3d8996c188416ecbf775f002eb2d58aa223b89761134944725a928dcab&tgWebAppVersion=7.4&tgWebAppPlatform=weba&tgWebAppThemeParams=%7B%22bg_color%22%3A%22%23212121%22%2C%22text_color%22%3A%22%23ffffff%22%2C%22hint_color%22%3A%22%23aaaaaa%22%2C%22link_color%22%3A%22%238774e1%22%2C%22button_color%22%3A%22%238774e1%22%2C%22button_text_color%22%3A%22%23ffffff%22%2C%22secondary_bg_color%22%3A%22%230f0f0f%22%2C%22header_bg_color%22%3A%22%23212121%22%2C%22accent_text_color%22%3A%22%238774e1%22%2C%22section_bg_color%22%3A%22%23212121%22%2C%22section_header_text_color%22%3A%22%23aaaaaa%22%2C%22subtitle_text_color%22%3A%22%23aaaaaa%22%2C%22destructive_text_color%22%3A%22%23e53935%22%7D`,
)
console.log('p', p)

export function Component() {
  const tgStore = useTgStore()

  console.log('params: ', tgStore)

  return (
    <div className="p-4">
      <h1 className="text-center text-2xl font-extrabold">Telegram mini app</h1>
      <h2 className="mt-4 text-xl font-semibold">Tool</h2>
      <LinkGenerator />
    </div>
  )
}

function LinkGenerator() {
  const [env, setEnv] = useState('test')
  const [baseLink, setBaseLink] = useState('https://t.me/codatta_bot/app')
  const [schema, setSchema] = useState('app://')
  const [miniLink, setMiniLink] = useState('')
  const [testLink, setTestLink] = useState('')
  const [localLink, setLocalLink] = useState('')

  useEffect(() => {
    console.log('LinkGenerator: ', env, baseLink, schema)
    const startapp = urlSafeEncode(schema)
    const miniLink = `${baseLink}?startapp=${startapp}`
    const localLink = `http://localhost:5175/m/landing?tgWebAppStartParam=${startapp}#tgWebAppData=user%3D%257B%2522id%2522%253A6868088893%252C%2522first_name%2522%253A%2522Mackey%2522%252C%2522last_name%2522%253A%2522%2522%252C%2522username%2522%253A%2522Yaya_007ma%2522%252C%2522language_code%2522%253A%2522en%2522%252C%2522allows_write_to_pm%2522%253Atrue%257D%26chat_instance%3D6742804130563490083%26chat_type%3Dprivate%26start_param%3D${startapp}%26auth_date%3D1720592423%26hash%3D6371e2caf81cb20bdb9e6a5697591461c27a5d4136b68197529bec29ac413924&tgWebAppVersion=7.4&tgWebAppPlatform=weba&tgWebAppThemeParams=%7B%22bg_color%22%3A%22%23212121%22%2C%22text_color%22%3A%22%23ffffff%22%2C%22hint_color%22%3A%22%23aaaaaa%22%2C%22link_color%22%3A%22%238774e1%22%2C%22button_color%22%3A%22%238774e1%22%2C%22button_text_color%22%3A%22%23ffffff%22%2C%22secondary_bg_color%22%3A%22%230f0f0f%22%2C%22header_bg_color%22%3A%22%23212121%22%2C%22accent_text_color%22%3A%22%238774e1%22%2C%22section_bg_color%22%3A%22%23212121%22%2C%22section_header_text_color%22%3A%22%23aaaaaa%22%2C%22subtitle_text_color%22%3A%22%23aaaaaa%22%2C%22destructive_text_color%22%3A%22%23e53935%22%7D`
    const testLink = `https://app.test.b18a.io/m/landing?tgWebAppStartParam=${startapp}#tgWebAppData=user%3D%257B%2522id%2522%253A6868088893%252C%2522first_name%2522%253A%2522Mackey%2522%252C%2522last_name%2522%253A%2522%2522%252C%2522username%2522%253A%2522Yaya_007ma%2522%252C%2522language_code%2522%253A%2522zh-hans%2522%252C%2522allows_write_to_pm%2522%253Atrue%257D%26chat_instance%3D4701672718142718505%26chat_type%3Dsender%26start_param%3D${startapp}%26auth_date%3D1720152543%26hash%3D3ec02c3d8996c188416ecbf775f002eb2d58aa223b89761134944725a928dcab&tgWebAppVersion=7.4&tgWebAppPlatform=weba&tgWebAppThemeParams=%7B%22bg_color%22%3A%22%23212121%22%2C%22text_color%22%3A%22%23ffffff%22%2C%22hint_color%22%3A%22%23aaaaaa%22%2C%22link_color%22%3A%22%238774e1%22%2C%22button_color%22%3A%22%238774e1%22%2C%22button_text_color%22%3A%22%23ffffff%22%2C%22secondary_bg_color%22%3A%22%230f0f0f%22%2C%22header_bg_color%22%3A%22%23212121%22%2C%22accent_text_color%22%3A%22%238774e1%22%2C%22section_bg_color%22%3A%22%23212121%22%2C%22section_header_text_color%22%3A%22%23aaaaaa%22%2C%22subtitle_text_color%22%3A%22%23aaaaaa%22%2C%22destructive_text_color%22%3A%22%23e53935%22%7D`

    setMiniLink(miniLink)
    setTestLink(testLink)
    setLocalLink(localLink)
  }, [env, baseLink, schema])

  return (
    <>
      <Card header={'Link generator'} className="mt-3">
        <div className="text-white">
          <h4 className="my-3 text-base font-medium">Env</h4>
          <Radio.Group
            value={env}
            onChange={(value) => setEnv(value as string)}
            defaultValue="test"
            direction="horizontal"
          >
            <Radio name="test">Test</Radio>
            <Radio name="pre">Pre</Radio>
            <Radio name="prod">Prod</Radio>
          </Radio.Group>
          <h4 className="mb-2 mt-4 text-base font-medium">Base Link</h4>
          <Input.TextArea
            className="mt-0"
            placeholder="请输入小程序链接"
            value={baseLink}
            onChange={(val: string) => setBaseLink(val)}
          />
          <h4 className="mb-2 mt-4 text-base font-medium">Schema</h4>
          <Input.TextArea
            className="mt-0"
            placeholder="请输入schema"
            value={schema}
            onChange={(val: string) => setSchema(val)}
          />
          <p className="text-gray-300">
            <span className="mr-3 rounded bg-slate-300 p-1 font-bold text-gray-800">Example</span>
            <span className="text-primary">app://</span>validation/SM202406140609093795/submit
          </p>

          <h4 className="mb-2 mt-4 text-base font-medium">
            <div className="flex items-center gap-3">
              Mini App Link <Copy content={miniLink}></Copy>
            </div>
          </h4>
          <Input.TextArea className="mt-0" placeholder="" value={miniLink} autoSize readOnly />

          <h4 className="mb-2 mt-4 text-base font-medium">
            <div className="flex items-center gap-3">
              Test Link <Copy content={testLink}></Copy>
            </div>
          </h4>
          <Input.TextArea className="mt-0" placeholder="" value={testLink} autoSize readOnly />

          <h4 className="mb-2 mt-4 text-base font-medium">
            <div className="flex items-center gap-3">
              Local Dev Link <Copy content={localLink}></Copy>
            </div>
          </h4>
          <Input.TextArea className="mt-0" placeholder="" value={localLink} autoSize readOnly />
        </div>
      </Card>
    </>
  )
}
