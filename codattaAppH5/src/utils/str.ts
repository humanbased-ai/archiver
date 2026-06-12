/**
 * 截断给定字符串到指定长度，并在指定位置插入省略号（或其他指定字符）。
 *
 * @param {string} str - 要截断的字符串。
 * @param {number} [len=16] - 截断后字符串的总长度，包括省略号。默认为16。
 * @param {EllipsisPosition} [pos='middle'] - 省略号插入的位置。可以是 'start'、'middle' 或 'end'。默认为 'middle'。
 * @param {string} [ellipsis='...'] - 用作省略号的字符串。默认为 '...'。
 * @returns {string} 截断后在指定位置插入省略号的字符串。
 *
 * @example
 * truncateString('1234567890abcdef', 10); // 返回 "1234...cdef"
 * truncateString('1234567890abcdef', 10, 'start'); // 返回 "...90abcdef"
 * truncateString('1234567890abcdef', 10, 'end'); // 返回 "123456...ef"
 * truncateString('1234567890abcdef', 10, 'middle', '***'); // 返回 "1234***cdef"
 */

import exp from 'constants'

type TEllipsisPosition = 'middle' | 'start' | 'end'

export function truncateStr(
  address: string,
  options?: {
    len?: number
    pos?: TEllipsisPosition
    ellipsis?: string
  },
): string {
  const { len = 16, pos = 'middle', ellipsis = '...' } = options || {}
  if (!address) return ''
  if (address.length <= len) return address

  const ellipsisLen = ellipsis.length
  const sliceLen = len - ellipsisLen

  switch (pos) {
    case 'start':
      return `${ellipsis}${address.slice(-sliceLen)}`
    case 'end':
      return `${address.slice(0, sliceLen)}${ellipsis}`
    case 'middle':
    default:
  }

  const halfSliceLen = Math.floor(sliceLen / 2)
  return `${address.slice(0, halfSliceLen)}${ellipsis}${address.slice(-halfSliceLen)}`
}

/**
 * 数字加千分号分隔符
 * @param num
 * @returns
 */
export function formatNumberWithSeparators(num: number | string = 0): string {
  return Number(num).toLocaleString('en-US')
}

export function hexToPhaser(hex: string): number {
  // 移除 "#" 如果存在
  hex = hex.replace(/^#/, '')

  // 将十六进制转换为十进制
  return parseInt(hex, 16)
}

export function formatNumber(num: number): string {
  let wei = num >= 1e9 ? 'b' : num >= 1e6 ? 'm' : num >= 1e3 ? 'k' : ''
  let value = num >= 1e9 ? num / 1e9 : num >= 1e6 ? num / 1e6 : num >= 1e3 ? num / 1e3 : num
  let str = value >= 100 ? Math.floor(value).toString() : value >= 10 ? value.toFixed(1) : value.toFixed(2)

  return str.replace(/\.0+$/, '') + wei
}
