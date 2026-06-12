/**
 * Debounces a function by delaying its execution until a certain amount of time has passed
 * since the last time it was called.
 *
 * 通过延迟函数的执行时间来实现函数防抖，直到距离上次调用已经过去一定的时间。
 *
 * @template T - The type of the function being debounced.
 * @param {T} func - The function to be debounced.
 * @param {number} delay - The delay in milliseconds before the function is executed.
 * @returns {(...args: Parameters<T>) => void} - The debounced function.
 */

export default function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  return function (this: ThisParameterType<T>, ...args: Parameters<T>): void {
    // 清除上一次的定时器
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }

    // 设定新的定时器
    timeoutId = setTimeout(() => {
      func.apply(this, args)
    }, delay)
  }
}
