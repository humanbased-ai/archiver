import CodeSnippet from '@/components/ui/code-snippet'

export default function SubmissionExistingData(props: { data: string[] }) {
  const { data } = props
  return (
    <div className="mt-3 overflow-hidden rounded">
      <CodeSnippet
        code={data.map((item) => JSON.stringify(item, null, 4)).join('\n\n')}
        className="rounded !bg-purple-900 [&>.hljs-attr]:text-[#FF9A51] [&>.hljs-string]:text-[#12DA71] [&>span]:whitespace-break-spaces [&>span]:font-inter [&>span]:text-sm [&>span]:font-medium [&>span]:tracking-tight"
      />
    </div>
  )
}
