import RadioCard from '../cards/RadioCard';

export default function AgentCard() {
  const options = [
    {
      name: 'Agent_type:1-handCount',
      title: (
        <div className="mb-4 font-semibold text-sm">
          Select one from the following five options.
        </div>
      ),
      options: [
        { value: '1', label: 'gripper' },
        { value: '2', label: 'two-finger hand' },
        { value: '3', label: 'three-finger hand' },
        { value: '4', label: 'four-finger hand' },
        { value: '5', label: 'five-finger hand' },
      ],
    },
    {
      name: 'Agent_type:1-armCount',
      title: (
        <div className="mb-4 font-semibold text-sm">
          The material contains either 1 or 2 arms?
        </div>
      ),
      options: [
        { value: '1', label: '1 arm' },
        { value: '2', label: '2 arms' },
      ],
    },
    {
      name: 'Agent_type:1-status',
      title: (
        <div className="mb-4 font-semibold text-sm">
          Is this arm mobile or static?
        </div>
      ),
      options: [
        { value: 'mobile', label: 'mobile arm' },
        { value: 'static', label: 'static arm' },
      ],
    },
  ];

  return (
    <div className="rounded-2xl bg-[#252532] p-6">
      <h2 className="font-semibold text-base text-white">Agent_type</h2>
      <p className="text-gray-400 mb-4 mt-2">
        Identify the main subject of the action in as detailed modules as
        possible.
      </p>
      <div className="flex flex-col gap-4">
        {options.map((item) => (
          <RadioCard
            className="rounded-lg bg-[#252532] p-6 border border-[#FFFFFF1F]"
            title={
              <div className="mb-4 font-semibold text-sm">{item.title}</div>
            }
            name={item.name}
            options={item.options}
          />
        ))}
      </div>
    </div>
  );
}
