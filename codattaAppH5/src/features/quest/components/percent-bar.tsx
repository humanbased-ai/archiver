export default function PercentBar({ max = 0, current = 0 }: { max: number; current: number }) {
  const percent = Math.round((current / max) * 100)
  const count = Math.round((current / max) * 5)

  return (
    <div className="relative h-[27px]">
      <svg width="95" height="27" viewBox="0 0 95 27" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M18.56 5.77982H18.02V6.31982V20.7198V21.2598H18.56H89.7936C91.5507 21.2598 93.0218 19.9284 93.1967 18.1801L94.0607 9.54013C94.262 7.52682 92.681 5.77982 90.6576 5.77982H18.56Z"
          fill="#2E2E37"
          stroke="white"
          strokeWidth="1.08"
        />
        <g>
          <path
            d="M59.3612 8.39046C59.4062 8.03015 59.7125 7.75977 60.0756 7.75977H63.8244C64.2575 7.75977 64.5926 8.13934 64.5388 8.56907L63.2788 18.6491C63.2338 19.0094 62.9275 19.2798 62.5644 19.2798H58.8156C58.3825 19.2798 58.0474 18.9002 58.1012 18.4705L59.3612 8.39046Z"
            fill={count >= 1 ? '#875DFF' : '#404049'}
          />
          <path
            d="M66.0012 8.39046C66.0462 8.03015 66.3525 7.75977 66.7156 7.75977H70.4644C70.8975 7.75977 71.2326 8.13934 71.1789 8.56907L69.9189 18.6491C69.8738 19.0094 69.5675 19.2798 69.2044 19.2798H65.4556C65.0225 19.2798 64.6875 18.9002 64.7412 18.4705L66.0012 8.39046Z"
            fill={count >= 2 ? '#875DFF' : '#404049'}
          />
          <path
            d="M72.6412 8.39046C72.6862 8.03015 72.9925 7.75977 73.3556 7.75977H77.1044C77.5375 7.75977 77.8726 8.13934 77.8188 8.56907L76.5588 18.6491C76.5138 19.0094 76.2075 19.2798 75.8444 19.2798H72.0956C71.6625 19.2798 71.3274 18.9002 71.3812 18.4705L72.6412 8.39046Z"
            fill={count >= 3 ? '#875DFF' : '#404049'}
          />
          <path
            d="M79.2812 8.39046C79.3262 8.03015 79.6325 7.75977 79.9956 7.75977H83.7444C84.1775 7.75977 84.5126 8.13934 84.4589 8.56907L83.1989 18.6491C83.1538 19.0094 82.8475 19.2798 82.4844 19.2798H78.7356C78.3025 19.2798 77.9675 18.9002 78.0212 18.4705L79.2812 8.39046Z"
            fill={count >= 4 ? '#875DFF' : '#404049'}
          />
          <path
            d="M85.9212 8.39046C85.9662 8.03015 86.2725 7.75977 86.6356 7.75977H90.3844C90.8175 7.75977 91.1526 8.13934 91.0988 8.56907L89.8388 18.6491C89.7938 19.0094 89.4875 19.2798 89.1244 19.2798H85.3756C84.9425 19.2798 84.6074 18.9002 84.6612 18.4705L85.9212 8.39046Z"
            fill={count === 5 ? '#875DFF' : '#404049'}
          />
        </g>

        <circle cx="13.52" cy="13.52" r="12.06" fill="#875DFF" stroke="white" strokeWidth="1.08" />
        <g clipPath="url(#clip0_1963_2618)">
          <path
            d="M10.032 6.57227L19.5326 8.59168"
            stroke="white"
            strokeWidth="0.607052"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7.50748 18.4478L17.0081 20.4672"
            stroke="white"
            strokeWidth="0.607052"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M11.22 6.8252L10.4627 10.3879L12.5037 13.9248"
            stroke="white"
            strokeWidth="0.607052"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M15.8206 20.2149L16.7357 15.9099L14.6 12.8184"
            stroke="white"
            strokeWidth="0.607052"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8.69612 18.7006L9.57961 14.5441L11.9196 13.0245"
            stroke="white"
            strokeWidth="0.607052"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M18.3456 8.33988L17.5883 11.9026L15.1852 13.7191"
            stroke="white"
            strokeWidth="0.607052"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10.4627 10.3879L11.22 6.8252L18.3454 8.33975L17.5882 11.9025L15.0682 13.539L16.7047 16.059L15.8843 19.9186L8.75884 18.404L9.93923 14.3106L11.8023 12.8448L10.4627 10.3879Z"
            fill="white"
          />
        </g>
        <defs>
          <clipPath id="clip0_1963_2618">
            <rect width="14.5693" height="14.5693" fill="white" transform="translate(7.90906 4.87939) rotate(12)" />
          </clipPath>
        </defs>
      </svg>
      <div className="absolute left-6 top-0 box-border flex h-full w-9 items-center justify-center py-1 text-xs font-semibold">
        <span className="origin-center scale-[.8] whitespace-nowrap">{percent}%</span>
      </div>
    </div>
  )
}
