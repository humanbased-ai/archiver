import { cn } from '@udecode/cn'

export default function Part(props: { info: Codatta.Validation.Detail['submitter_info'] }) {
  const {
    hunting_count,
    hunting_s2_pass_count,
    hunting_s2_pass_proportion,
    hunting_s2_review_count,
    points,
    reputation,
    s2_pass_count,
    s2_pass_proportion,
    s2_review_count,
    s2_review_proportion,
    submission_count,
  } = props.info

  return (
    <div className="mt-2 rounded-lg bg-purple-900 p-3 text-sm text-gray-200">
      <Row title="Reputation:" value={reputation} />
      <Row title="Reward:" value={points} className="mt-2" />
      <Divider className="mb-3" />

      <h3 className="font-medium tracking-tight text-white">Submission Data</h3>
      <Row title="Number of passed s2-2:" value={s2_pass_count} className="mt-2" />
      <Row title="Number of entered s2-2" value={s2_review_count} className="mt-2" />
      <Row title="Number of submissions:" value={submission_count} className="mt-2" />

      <HighlightRow
        items={[
          { title: 'Pass rate of s2-2:', value: s2_pass_proportion + '%' },
          { title: 'Enter rate of s2-2:', value: s2_review_proportion + '%' },
        ]}
        className="mt-2"
      />

      <Divider className="mb-3 mt-4" />

      <h3 className="font-medium tracking-tight text-white">Bounty Data</h3>
      <Row title="Number of passed s2-2:" value={hunting_s2_pass_count} className="mt-2" />
      <Row title="Number of entered s2-2" value={hunting_s2_review_count} className="mt-2" />
      <Row title="Number of submissions:" value={hunting_count} className="mt-2" />

      <HighlightRow
        items={[{ title: 'Pass rate of s2-2:', value: hunting_s2_pass_proportion + '%' }]}
        className="mt-2"
      />
    </div>
  )
}

function Row({ title, value, className }: { title: string; value: string | number; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <span>{title}</span>
      <span className="text-white">{value}</span>
    </div>
  )
}

function HighlightRow({ items, className }: { items: { title: string; value: string }[]; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2 whitespace-nowrap rounded bg-purple-900 p-2', className)}>
      {items.map((item) => (
        <div className="flex text-xs font-medium leading-5">
          <span className="mr-2">{item.title}</span>
          <span className="rounded bg-purple-200 px-1 text-primary">{item.value}</span>
        </div>
      ))}
    </div>
  )
}

function Divider({ className }: { className?: string }) {
  return <div className={cn('mt-2 h-[1px] bg-purple-100', className)}></div>
}
