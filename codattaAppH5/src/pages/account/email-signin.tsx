import { OTPInput} from 'input-otp'
import { useEffect, useState } from 'react'
import { cn } from '@udecode/cn'
import { useLocation } from 'react-router-dom'
import { authStoreActions } from '@/store/auth.store'
import accountApi2 from '@/api-v2/account.api'
import { useNavigate, useSearchParams } from 'react-router-dom'
import TgBackButton from '@/features/tg/components/back-button'
import { Popup } from 'react-vant'
import { GradientButton } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

const CAPTCHA_CODE_LENGTH = 6

export function Component() {
  const [inputStatus, setInputStatus] = useState<'' | 'error' | 'success'>('')
  const [loading, setLoading] = useState(false)
  const { state } = useLocation()
  const [count, setCount] = useState(0)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const email = state.email

  const [showEmailCaptcha, setShowEmailCaptcha] = useState(false)
  const [captchaImage, setCaptchaImage] = useState('')
  const [captchaLoading, setCaptchaLoading] = useState(false)
  const [sendEmailLoading, setSendEmailLoading] = useState(false)
  const [captchaCode, setCaptchaCode] = useState('')
  const [captchaError, setCaptchaError] = useState('')

  async function getEmailCode() {
    setCaptchaLoading(true)
    try {
      await accountApi2.getEmailCode({
        account_type: 'email',
        email: state.email,
      })
      startCountDown()
    } catch (err: any) {
      console.log(err.message)
    }
    setCaptchaLoading(false)
  }

  async function handleEmailLogin() {
    getEmailCode()
  }

  async function handleGetEmailCode() {
    setSendEmailLoading(true)
    try {
      setCaptchaError('')
      await accountApi2.getEmailCode({account_type: 'email', email: state.email})
      startCountDown()
      setShowEmailCaptcha(false)
      setSendEmailLoading(false)
    } catch (err: any) {
      setCaptchaError(err?.message)
      setSendEmailLoading(false)
    }
  }

  async function handleOTPChange(text: string) {
    setInputStatus('')
    if (text.length === CAPTCHA_CODE_LENGTH) {
      setLoading(true)
      try{
        const res = await authStoreActions.emailLogin(state.email, text)
        setInputStatus('success')
        const redirectUrl = searchParams.get('redirect')
        navigate(redirectUrl || '/', { replace: true })
      } catch (err:any) {
        setInputStatus('error')
      }
      setLoading(false)
    }
  }

  function startCountDown() {
    let count = 60
    const interval = setInterval(() => {
      if (count === 0) clearInterval(interval)
      setCount(count--)
    }, 1000)
  }

  useEffect(() => {
    getEmailCode()
  }, [])

  return (
    <div className="p-6 text-sm text-center text-white h-full flex flex-col justify-center">
      <TgBackButton visible={false} />
      <div className="my-4 text-lg font-bold">
        <p>We’ve sent a verification code to</p>
        <p className="font-semibold">{state.email}</p>
      </div>
      <div className="mb-6 text-center">
        <OTPInput maxLength={CAPTCHA_CODE_LENGTH} onChange={handleOTPChange} render={
          ({ slots }) => <div className='flex items-center gap-3 justify-center'>
            {slots.map((slot, index) => {
              return <input
                value={slot.char || ''}
                key={index}
                disabled={loading}
                className={
                  cn(`border-[1px] text-white border-gray-700 rounded-xl w-11 h-11 bg-gray-800 text-base flex items-center justify-center text-center transition-all`,
                    slot.isActive ? 'border-gray-200' : '',
                    inputStatus == 'error' ? 'border-red-500 text-red-500' : '',
                    inputStatus == 'success' ? 'border-green-500 text-green-500' : '',
                    'disabled:text-gray-400 disabled:border-gray-400 disabled:bg-gray-700 disabled:opacity-60'
                  )
                }>
              </input>
            })}
          </div>
        }></OTPInput>
      </div>
      <div>
        <p className='mb-2'>Did not receive your code yet?</p>
        <button onClick={handleEmailLogin} className="cursor-pointer text-gray-400" disabled={count > 0}>
          resend code {count > 0 ? `(${count}s)` : ''}
        </button>
      </div>

      <Popup
        className='bg-gray-800 p-4 rounded-lg text-white transition-all absolute'
        visible={showEmailCaptcha} onClose={() => setShowEmailCaptcha(false)}>
        <div className='flex flex-col gap-4'>
          <h1>Input Email Captcha</h1>
          {captchaLoading
            ? <div className='rounded-lg aspect-[12/5] w-full flex items-center justify-center'><Loader2 className="animate-spin" size={24} /></div>
            : <img src={captchaImage} className='rounded-lg aspect-[12/5] w-full' alt="" onClick={getEmailCode} />
          }
          <div>
            <input placeholder='Enter captcha' className='block w-full rounded-lg border border-gray-700 bg-gray-800 text-sm leading-6 mb-1' onChange={e => setCaptchaCode(e.target.value)} />
            <div className={cn('text-red-500 text-sm transition-all', captchaError ? 'h-[1.5em]' : 'h-0')}>{captchaError}</div>
          </div>
          <GradientButton disabled={sendEmailLoading} className='flex items-center justify-center' onClick={handleGetEmailCode}>{sendEmailLoading ? <Loader2 className="animate-spin" size={24} /> : 'Continue'}</GradientButton>
        </div>
      </Popup>
    </div>
  )
}

