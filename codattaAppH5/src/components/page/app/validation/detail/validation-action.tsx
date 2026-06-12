import { cn } from '@udecode/cn'

import { Info, Check, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

// import MainButton from '@/components/ui/button/main-buttton'

import validationApi from '@/api/validation.api'
import { GradientButton } from '@/components/ui/button'
import { TRACK_CATEGORY, trackEvent } from '@/utils/ga'
import Toast from '@/utils/toast'

function SwitchButton(props: { onChange?: (decision: string) => void }) {
  const { onChange } = props
  const [decision, setDecision] = useState('')

  function handleSelect(reason: string) {
    setDecision(reason)
    onChange?.(reason)
  }

  return (
    <div className="flex justify-evenly gap-2">
      <button
        className={cn(
          'flex-1 rounded-full border py-2 text-white transition-all',
          decision === 'APPROVE' ? 'border-purple-700 bg-purple-700' : 'border-white border-opacity-25',
        )}
        onClick={() => handleSelect('APPROVE')}
      >
        Approve
      </button>
      <button
        className={cn(
          'flex-1 rounded-full border py-2 text-white transition-all',
          decision === 'REJECT' ? 'border-purple-700 bg-purple-700' : 'border-white border-opacity-25',
        )}
        onClick={() => handleSelect('REJECT')}
      >
        Reject
      </button>
    </div>
  )
}

function RejectReason(props: { hideSelect?: boolean; onChange?: (reason: string) => void }) {
  const { hideSelect } = props
  const [reason, setReason] = useState('')
  const [inputText, setInputText] = useState('')

  const options = ['Address does not exist', 'Evidence does not match data information', 'Invalid evidence', 'Others']

  function handleSelect(reason: string) {
    setReason(reason)
    if (reason === 'Others') {
      props.onChange?.(inputText)
      return
    }
    props.onChange?.(reason)
  }

  function handleInput(e: any) {
    setInputText(e.currentTarget.value)
    props.onChange?.(e.currentTarget.value)
  }

  useEffect(() => {
    if (hideSelect == true) {
      props.onChange?.(inputText)
    } else if (reason === 'Others') {
      props.onChange?.(inputText)
    } else {
      props.onChange?.(reason)
    }
  }, [hideSelect])

  return (
    <div className={cn('flex flex-col')}>
      <div
        className={cn(
          'flex flex-col gap-3 overflow-hidden text-sm transition-all',
          hideSelect ? 'mb-0 h-0 opacity-100' : 'mb-4 h-[116px] opacity-100',
        )}
      >
        {options.map((item) => {
          return (
            <div className="flex items-center gap-2 transition-all">
              <div
                className={cn(
                  'flex h-4 w-4 items-center justify-center rounded-[4px] transition-all',
                  item === reason ? 'bg-primary' : 'bg-purple-900',
                )}
                onClick={() => handleSelect(item)}
              >
                <Check className="origin-center transition-all" size={item === reason ? 14 : 0} />
              </div>
              <span>{item}</span>
            </div>
          )
        })}
      </div>

      <textarea
        onInput={handleInput}
        className={cn(
          'h-[160px] overflow-hidden rounded-lg border-none bg-purple-900 text-sm placeholder-white placeholder-opacity-25 transition-all',
          !hideSelect && reason !== 'Others' ? 'mb-0 h-0 opacity-0' : 'mb-4 h-[160px] opacity-100',
        )}
        placeholder={`Please state reasons behind your solid decision and, where applicable, provide relevant evidence. Such evidence may include:
1. Transaction hashes
2. Transaction screenshots
3. Social media posts
4. Links from blockchain explorers`}
      ></textarea>
    </div>
  )
}

export default function ValidationAction(props: {
  submissionId: string
  onFinish?: () => void
  onClose?: () => void
  showHead?: boolean
}) {
  const { submissionId, onFinish, onClose, showHead = true } = props
  const [decision, setDecision] = useState('')
  const [reasonText, setReasonText] = useState('')
  const [loading, setLoading] = useState(false)

  const canSubmit = useMemo((): boolean => {
    if (!decision) return false
    if (decision === 'REJECT' && !reasonText) return false
    return true
  }, [reasonText, decision])

  async function handleSubmit() {
    console.log('handleSubmit')

    setLoading(true)
    try {
      trackEvent(TRACK_CATEGORY.VALIDATION_SUBMIT_CLICK, { extra: { submission_id: submissionId, action: decision } })
      const res = await validationApi.validate({
        submission_id: submissionId,
        decision,
        reason: { text: reasonText, files: [] },
      })
      Toast.success('Submit success')
      onFinish?.()
    } catch (err: any) {
      Toast.fail(err.message || 'Exception occurred! please try again.')
    }
    setLoading(false)
  }

  return (
    <>
      <div>
        <div className={cn('mb-4 flex items-center', showHead ? '' : 'hidden')}>
          <h2 className="font-700 text-xl">Action</h2>
          <X className="ml-auto cursor-pointer text-white text-opacity-40" onClick={onClose}></X>
        </div>
        <div className="mb-5">
          <label className="mb-3 flex items-center gap-1 text-base">
            Solid Decision <Info size={14} />:
          </label>
          <SwitchButton onChange={setDecision}></SwitchButton>
        </div>
        <div className="mb-2">
          <label className="mb-3 flex items-center gap-1 text-base">Reason:</label>
          <RejectReason hideSelect={decision !== 'REJECT'} onChange={setReasonText}></RejectReason>
        </div>
        <div className="mb-2 flex gap-2 text-xs leading-5 text-white text-opacity-45">
          <Info size={12} className="h-5 shrink-0 py-1" />
          <span>The reason you provide will be automatically validated by AI (LLM-Claude3) metisls</span>
        </div>
        {/* <MainButton
          disabled={!canSubmit}
          loading={loading}
          className="h-10 w-full transition-all"
          onClick={handleSubmit}
        >
          Submit
        </MainButton> */}

        <div className="flex gap-3">
          <GradientButton disabled={!canSubmit} loading={loading} className="flex-1 py-2" onClick={handleSubmit}>
            Submit
          </GradientButton>
        </div>
      </div>
    </>
  )
}
