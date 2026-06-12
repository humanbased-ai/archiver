const data: { keyword: string; des: string }[] = [
  {
    keyword: "Publish Rewards for Data Collection:",
    des: "Motivate contributors with meaningful incentives for task participation.",
  },
  {
    keyword: "Maximize Contributor Ownership:",
    des: "Enable contributors to retain full ownership of their data’s value.",
  },
  {
    keyword: "Define Data Collection Freedom:",
    des: "Tailor data collection tasks to meet your specific needs.",
  },
  {
    keyword: "Reduce Friction:",
    des: "Minimize transaction costs and inefficiencies while safeguarding privacy and participant rights.",
  },
];

export default function Page() {
  return (
    <div className="page mt-10 text-sm font-medium text-[#66666670] lg:mt-20">
      <h2 className="text-xl font-semibold leading-6 text-black">🌟 What Makes a Codatta Frontier unique?</h2>
      <p className="mt-3">
        Codatta Frontier is not just a data labeling tool — it’s a powerful bridge between data collection demands and
        contributors. As a Frontier creator, you can:
      </p>
      <ul className="mt-6 space-y-3 leading-[22px]">
        {data.map((item, index) => (
          <li key={item.keyword + index}>
            <span className="block font-semibold text-black lg:inline lg:pr-3">{item.keyword}</span>
            <span className="block lg:inline">{item.des}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
