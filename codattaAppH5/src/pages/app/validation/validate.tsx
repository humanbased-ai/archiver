import TransitionEffect from '@/components/ui/transition-effect'
import ValidationAction from '@/components/page/app/validation/detail/validation-action'
import PageHead from '@/components/page/page-head'
import { useNavigate, useParams } from 'react-router-dom'

export function Component() {
  const { submission_id } = useParams()
  const navigate = useNavigate()

  function handleFinish() {
    navigate(-2)
  }

  return (
    <TransitionEffect className="box-border flex h-full flex-col">
      <PageHead title="Validation" className="sticky top-0 w-full"></PageHead>

      <div className="px-4 py-6">
        <ValidationAction submissionId={submission_id!} onFinish={handleFinish} showHead={false} />
      </div>
    </TransitionEffect>
  )
}
