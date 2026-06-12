import queryString from 'query-string'
import { Base64 } from 'js-base64'

type TParseSchemaRes = {
  isApp: boolean
  isUrl?: boolean //是否为http地址
  path: string
  url: string
  params: Record<string, any>
  hash: { origin: string; parsed: Record<string, any> }
}

export function parseSchema(schema = ''): TParseSchemaRes {
  try {
    const parsedUrl = queryString.parseUrl(schema.trim(), { parseFragmentIdentifier: true })
    const parsedHash = parsedUrl.fragmentIdentifier && queryString.parseUrl(`?${parsedUrl.fragmentIdentifier}`).query
    const isApp = /^(tma|app):\/\//.test(schema)
    const isUrl = !isApp && isValidHttpUrl(schema)

    return {
      isApp,
      isUrl,
      path: parsedUrl.url,
      url: isApp ? schema.replace(/^(tma|app):\/\//, '/') : schema,
      params: parsedUrl.query || {},
      hash: {
        origin: `#${parsedUrl.fragmentIdentifier}`,
        parsed: parsedHash as any,
      },
    }
  } catch (e) {
    console.error('非法schema: ', e)
    return { isApp: false, path: '', url: '', params: {}, hash: { origin: '', parsed: {} } }
  }
}

/**
 * URL 安全的 Base64 编码
 * 使用场景：生成tg mini app startApp参数。
 * @param schema
 */
export function urlSafeEncode(schema: string) {
  if (!schema) return
  return Base64.encodeURI(schema)
}

export function urlSafeDecode(schema: string) {
  return Base64.decode(schema)
}

/**
 * 判断是否为合法的url地址
 * @param url
 * @returns
 */
function isValidHttpUrl(url: string): boolean {
  if (!/^https?:\/\//.test(url.trim())) {
    return false
  }

  try {
    new URL(url)
    return true
  } catch (e) {
    return false
  }
}
