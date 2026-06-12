export function safeExecute(fn: () => void, error?: (message?: string) => void) {
  try {
    return fn()
  } catch (e: any) {
    const stack = new Error().stack?.split('\n')
    const caller = stack ? stack[2].trim() : 'unknown location'
    console.error(`Error in function ${fn.name} at ${caller}:`, e?.message)

    error?.(e.message)
  }
}
