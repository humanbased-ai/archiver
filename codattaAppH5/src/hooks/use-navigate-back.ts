import { useNavigate } from 'react-router-dom'

export function useNavigateBack() {
  const navigate = useNavigate()
  const back = () => {
    if (window.history.length === 1) navigate('/')
    else navigate(-1)
  }

  return back
}
