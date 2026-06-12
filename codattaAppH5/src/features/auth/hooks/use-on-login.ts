import { useAuthStore } from '@/store/auth.store'
import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function useLogin() {
  const { isLoginedIn, token, uid } = useAuthStore()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    console.log('useOnLogin', isLoginedIn, token, uid)

    if (isLoginedIn) {
      const redirectUrl = searchParams.get('redirect')
      navigate(redirectUrl || '/')
    }
  }, [isLoginedIn, token, uid])
}
