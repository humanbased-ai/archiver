export function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function splitTitle(str: string): string {
  return str.split(/(?=[A-Z])/).join(' ')
}

/**
 * 数字加千分号分隔符
 * @param num
 * @returns
 */
export function formatNumberWithSeparators(num: number | string = 0): string {
  return Number(num).toLocaleString('en-US')
}
