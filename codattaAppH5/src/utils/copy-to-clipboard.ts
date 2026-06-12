/**
 *
 * @param text
 */
export default function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard) {
    // 使用 navigator.clipboard 进行复制
    return navigator.clipboard.writeText(text)
  } else {
    // polyfill
    return new Promise((resolve, reject) => {
      // 创建一个隐藏的 textarea 元素
      const textArea = document.createElement('textarea')
      textArea.value = text

      // 设置 textarea 样式以避免影响布局
      textArea.style.position = 'fixed'
      textArea.style.top = '0'
      textArea.style.left = '0'
      textArea.style.width = '2em'
      textArea.style.height = '2em'
      textArea.style.padding = '0'
      textArea.style.border = 'none'
      textArea.style.outline = 'none'
      textArea.style.boxShadow = 'none'
      textArea.style.background = 'transparent'

      // 将 textarea 元素添加到文档中
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()

      try {
        // 尝试执行复制命令
        const successful = document.execCommand('copy')
        if (successful) {
          resolve() // 复制成功，解决 Promise
        } else {
          reject(new Error('Copy command was unsuccessful')) // 复制失败，拒绝 Promise
        }
      } catch (err) {
        console.error('Copy:', err)
        reject(new Error('Unable to copy: ')) // 捕获异常，拒绝 Promise
      }

      // 从文档中移除 textarea 元素
      document.body.removeChild(textArea)
    })
  }
}
