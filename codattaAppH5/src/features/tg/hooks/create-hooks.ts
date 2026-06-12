import { type CleanupFn, type AnyFn } from '@telegram-apps/sdk'
import { useEffect, useState } from 'react'

import { useSDK } from '../context/sdk-context'
import type { SDKContextItem } from '../context/sdk-provider.types'

import { safeExecute } from '@/utils/try-catch'

type ExtractResult<T> = T extends [result: infer R, cleanup: CleanupFn]
  ? ExtractResult<R>
  : T extends PromiseLike<any>
    ? Awaited<T> | undefined
    : T

type HookFnResult<Fn extends AnyFn> = ExtractResult<ReturnType<Fn>>

export interface HookRaw<Factory extends AnyFn> {
  (): [SDKContextItem<HookFnResult<Factory>>, Error]
}

export interface HookResult<Factory extends AnyFn> {
  (): [HookFnResult<Factory>, Error]
}

export type Hooks<Factory extends AnyFn> = [useResult: HookResult<Factory>, useRaw: HookRaw<Factory>]

/**
 * @returns Hooks, simplifying work process with the SDK components.
 */
export function createHooks<Factory extends AnyFn>(factory: Factory, throwError?: boolean): Hooks<Factory> {
  function useRaw(): [SDKContextItem<HookFnResult<Factory>>, Error] {
    const sdk = useSDK()
    const [raw, setRaw] = useState(() => sdk.use(factory))
    const [error, setError] = useState<Error>()

    // Each time sdk context changes, we are updating the local value.
    useEffect(() => {
      const raw = sdk.use(factory)

      if (raw?.error) {
        console.error(raw.error)
        setError(raw?.error as Error)
      }

      if (!throwError && raw?.result && typeof raw?.result === 'object') {
        hijackMethodsOnHookFnResult(raw?.result, setError)
      }

      setRaw(raw)
    }, [sdk])

    return [(raw ?? {}) as SDKContextItem<HookFnResult<Factory>>, error as Error]
  }

  function useResult(): [HookFnResult<Factory>, Error] {
    const [raw, error] = useRaw()

    return [raw?.result as HookFnResult<Factory>, error]
  }

  return [useResult, useRaw]
}

/**
 * 该函数接受一个对象 
  对象上的每个方法被劫持，在调用时使用 safeExecute 包装，以捕获并记录错误。
  包括 show、hide、on、off 等方法。
 * @param hookFnResult 
 * @returns 
 */
function hijackMethodsOnHookFnResult(hookFnResult: any, onError: (err: any) => void) {
  if (typeof hookFnResult !== 'object') return hookFnResult

  const methods = Object.keys(hookFnResult)

  methods.forEach((method) => {
        const descriptor = Object.getOwnPropertyDescriptor(hookFnResult, method)
        if (descriptor && (descriptor.get || descriptor.set)) {
          // Skip getter and setter
          return
        }
    if (typeof hookFnResult[method] === 'function') {
      const originalMethod = hookFnResult[method]
      hookFnResult[method] = (...args: any[]) => safeExecute(() => originalMethod(...args), onError)
    }
  })

  return hookFnResult
}
