import { cn } from '@udecode/cn';
import { Button, Collapse, CollapseProps, Form, Input, Typography } from 'antd';
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { KEYWORDS } from '@/config';

export default function RelationsCard() {
  const maxInputs = 10;
  const countRef = useRef(3);
  const [inputs, setInputs] = useState<string[]>(['1', '2']);
  const [showExample, setShowExample] = useState(false);
  const handleAdd = () => {
    countRef.current += 1;
    setInputs([...inputs, countRef.current.toString()]);
  };
  const handleDelete = (index: number) => {
    if (inputs.length === 1) {
      return;
    }
    const newInputs = [...inputs];
    newInputs.splice(index, 1);
    setInputs(newInputs);
  };
  const toggleExample = () => {
    setShowExample((pre) => !pre);
  };

  return (
    <div className="rounded-2xl bg-[#252532] p-6">
      <h2 className="font-semibold text-base text-white">Relations</h2>
      <p className="text-gray-400 mb-4 mt-2">
        Describe the relationship between any two targets among
        objects,agents_type,and environmental elements.
      </p>
      <div className="">
        {inputs.map((input, index) => (
          <div
            className="flex justify-between items-center"
            key={'relations' + input}
          >
            <RelationCard name={'relations:' + input} className="flex-1" />
            {inputs.length > 1 && (
              <Button
                className="bg-transparent border-none text-white hover:bg-[#3a3a4a] focus:bg-[#3a3a4a]"
                icon={<X />}
                onClick={() => handleDelete(index)}
              />
            )}
          </div>
        ))}

        <div className="flex items-center justify-between mt-3">
          {inputs.length < maxInputs ? (
            <Button
              icon={<PlusIcon />}
              className="flex items-center px-4 py-2 bg-transparent text-white text-sm rounded-full font-normal "
              onClick={handleAdd}
            >
              + Add More Relations
            </Button>
          ) : (
            <div></div>
          )}

          <div
            onClick={toggleExample}
            className="text-white flex items-center cursor-pointer"
          >
            Example
            {showExample ? (
              <ChevronUpIcon className="ml-1" />
            ) : (
              <ChevronDownIcon className="ml-1" />
            )}
          </div>
        </div>
        <div
          className={cn(
            'transition-all duration-300',
            showExample ? 'h-auto opacity-100' : 'h-0 opacity-0 overflow-hidden'
          )}
        >
          <RelationsExampleCard />
        </div>
      </div>
    </div>
  );
}

function RelationCard({
  name,
  className,
}: {
  name: string;
  className: string;
}) {
  return (
    <div className={cn('flex flex-nowrap gap-6', className)}>
      <div>
        <div className="text-xs text-[#BBBBBE]">target A</div>
        <Form.Item
          name={`${name}-a`}
          style={{ flex: 1 }}
          rules={[{ required: true, message: 'target A is required' }]}
        >
          <Input
            placeholder="target A"
            className="mt-2 placeholder-[#404049] focus:placeholder-[#BBBBBE] border border-white text-white focus:text-black text-center"
            variant="filled"
            maxLength={40}
          />
        </Form.Item>
      </div>
      <div>
        <div className="text-xs text-[#BBBBBE]">&nbsp;</div>
        <Form.Item
          name={`${name}-prep`}
          style={{ flex: 1 }}
          rules={[{ required: true, message: 'prep is required' }]}
        >
          <Input
            placeholder="prep for relation"
            className="mt-2 placeholder-[#404049] focus:placeholder-[#BBBBBE] border border-transparent border-b-white text-white focus:text-black text-center rounded-none"
            variant="filled"
            maxLength={40}
          />
        </Form.Item>
      </div>
      <div>
        <div className="text-xs text-[#BBBBBE]">target B</div>
        <Form.Item
          name={`${name}-b`}
          style={{ flex: 1 }}
          rules={[{ required: true, message: 'target B is required' }]}
        >
          <Input
            placeholder="target B"
            className="mt-2 placeholder-[#404049] focus:placeholder-[#BBBBBE] border border-white text-white focus:text-black text-center"
            variant="filled"
            maxLength={40}
          />
        </Form.Item>
      </div>
    </div>
  );
}

function RelationsExampleCard() {
  const items: CollapseProps['items'] = [
    {
      key: 'verb',
      label: 'Verb',
      children: (
        <div className="flex flex-wrap gap-4">
          {KEYWORDS.filter((item) => item.type === 'Verb')
            .flatMap((item) => item.keywords)
            .sort()
            .map((word, index) => (
              <Typography.Text
                copyable={true}
                className="text-white border border-[#FFFFFF1F] rounded-full px-4 py-1 mr-4 flex items-center"
                key={word + index}
              >
                {word}
              </Typography.Text>
            ))}
        </div>
      ),
    },
    {
      key: 'prep',
      label: 'Prep',
      children: (
        <div className="flex flex-wrap gap-4">
          {KEYWORDS.filter((item) => item.type === 'Prep')
            .flatMap((item) => item.keywords)
            .sort()
            .map((word, index) => (
              <Typography.Text
                copyable={true}
                className="text-white border border-[#FFFFFF1F] rounded-full px-4 py-1 mr-4 flex items-center"
                key={word + index}
              >
                {word}
              </Typography.Text>
            ))}
        </div>
      ),
    },
  ];
  return (
    <div className="max-w-[640px] border border-[#FFFFFF1F] border-solid rounded-xl p-4 mt-6">
      <Collapse
        ghost
        items={items}
        style={{ color: 'red' }}
        defaultActiveKey={['verb', 'prep']}
        collapsible={'header'}
        expandIconPosition="end"
        size="small"
        className=" text-white [&_.ant-collapse-header-text]:text-white [&_.ant-collapse-expand-icon]:text-white"
      />
      <div className="w-full h-[1px] bg-[#FFFFFF1F] my-3"></div>
      <div className="flex gap-6">
        <div className="flex-1">
          <div className="text-xs text-[#BBBBBE]">target A</div>
          <div className="border border-white rounded-lg leading-8 mt-2 text-white text-center font-semibold text-sm cursor-not-allowed">
            Apple
          </div>
        </div>
        <div className="flex-1">
          <div className="text-xs text-transparent">On</div>
          <div className="text-center leading-8 mt-2 text-white text-sm font-semibold  border border-transparent border-b-white cursor-not-allowed">
            On
          </div>
        </div>
        <div className="flex-1">
          <div className="text-xs text-[#BBBBBE]">target B</div>
          <div className="border border-white rounded-lg leading-8 mt-2 text-white text-center font-semibold text-sm cursor-not-allowed">
            Table
          </div>
        </div>
      </div>
    </div>
  );
}
