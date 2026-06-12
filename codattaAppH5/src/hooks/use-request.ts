import { useState, useEffect, useCallback } from 'react'

type RequestStatus = 'idle' | 'loading' | 'success' | 'error'

interface UseRequestState<T> {
  data: T | null
  error: Error | null
  status: RequestStatus
  loading: boolean
}

interface UseRequestOptions {
  manual?: boolean
}

type FetchFunction<T> = () => Promise<T>

export function useRequest<T>(fetchFunction: FetchFunction<T>, options: UseRequestOptions = {}) {
  const [state, setState] = useState<UseRequestState<T>>({
    data: null,
    error: null,
    status: 'idle',
    loading: false,
  })

  const fetchData = async () => {
    setState({ data: null, error: null, status: 'loading', loading: true })
    try {
      const data = await fetchFunction()
      setState({ data, error: null, status: 'success', loading: false })
    } catch (error) {
      setState({ data: null, error: error as Error, status: 'error', loading: false })
    }
  }

  useEffect(() => {
    if (!(options?.manual ?? true)) {
      // 默认开启
      fetchData()
    }
  }, [fetchData, options?.manual])

  return {
    ...state,
    fetch: fetchData,
  }
}
