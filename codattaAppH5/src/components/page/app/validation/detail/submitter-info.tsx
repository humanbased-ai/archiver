export default function SubmitterInfo(props: { info: Codatta.Validation.Detail['submitter_info'] }) {
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
    <div className="flex flex-col gap-3 bg-purple-900 p-3 text-sm leading-4">
      <div>
        <span className="w-184px inline-block text-gray-400">Reputation:</span>
        <span className="">{reputation}</span>
      </div>
      <div>
        <span className="inline-block w-[184px] text-gray-400">Reward:</span>
        <span className="">{points}</span>
      </div>

      <div className="my-1 border-b border-purple-200 border-opacity-30"></div>

      <div className="mb-1">Submission Data</div>
      <div>
        <span className="inline-block w-[184px] text-gray-400">Number of passed s2-2:</span>
        <span className="">{s2_pass_count}</span>
      </div>
      <div>
        <span className="inline-block w-[184px] text-gray-400">Number of entered s2-2:</span>
        <span className="">{s2_review_count}</span>
      </div>
      <div>
        <span className="inline-block w-[184px] text-gray-400">Number of submissions:</span>
        <span className="">{submission_count}</span>
      </div>
      <div className="flex items-center gap-2 rounded-md bg-purple-900 px-2 py-2 text-xs">
        <span className="text-gray-400">Pass rate of s2-2:</span>
        <span className="rounded-md bg-primary bg-opacity-30 px-1 py-1 text-primary">
          {Math.round(s2_pass_proportion)}%
        </span>
        <span className="text-gray-400">Enter rate of s2-2:</span>
        <span className="rounded-md bg-primary bg-opacity-30 px-1 py-1 text-primary">
          {Math.round(s2_review_proportion)}%
        </span>
      </div>

      <div className="my-1 border-b border-purple-200 border-opacity-30"></div>

      <div className="mb-1">Bounty Data</div>
      <div>
        <span className="inline-block w-[184px] text-gray-400">Number of passed s2-2:</span>
        <span className="">{hunting_s2_pass_count}</span>
      </div>
      <div>
        <span className="inline-block w-[184px] text-gray-400">Number of entered s2-2:</span>
        <span className="">{hunting_s2_review_count}</span>
      </div>
      <div>
        <span className="inline-block w-[184px] text-gray-400">Number of submissions:</span>
        <span className="">{hunting_count}</span>
      </div>

      <div className="flex items-center gap-2 rounded-md bg-purple-900 px-2 py-2 text-xs">
        <span className="text-gray-400">Pass rate of s2-2:</span>
        <span className="rounded-md bg-primary bg-opacity-30 px-1 py-1 text-primary">
          {hunting_s2_pass_proportion}%
        </span>
      </div>
    </div>
  )
}
