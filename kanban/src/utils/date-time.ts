import dayjs from 'dayjs'

export function formateDate(date: string | number, format: string) {
  return dayjs(date).format(format)
}
