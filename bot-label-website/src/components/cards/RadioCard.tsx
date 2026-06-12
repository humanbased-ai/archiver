import { Radio, Form, Input } from 'antd';
import { useState } from 'react';

export default function RadioCard({
  title,
  des,
  name,
  options,
  className,
}: {
  title?: string | React.ReactNode;
  des?: string | React.ReactNode;
  name: string;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const [showOther, setShowOther] = useState(false);

  const handleRadioChange = (e: any) => {
    setShowOther(e.target.value.toLowerCase() === 'other');
  };

  return (
    <div className={className}>
      {title && <h2 className="font-semibold text-base text-white">{title}</h2>}
      {des && (
        <p className="text-gray-400 mb-4 mt-2">
          Describe the environment depicted in the material.
        </p>
      )}
      <Form.Item
        name={name}
        className="mb-0"
        initialValue=""
        rules={[{ required: true, message: 'Please select one option.' }]}
      >
        <Radio.Group
          onChange={handleRadioChange}
          className="grid grid-cols-3 gap-4"
          size="small"
        >
          {options.map((option) => (
            <Radio
              key={option.value}
              value={option.value}
              className="mx-0 text-white text-sm"
            >
              {option.label || option.value}
            </Radio>
          ))}
        </Radio.Group>
      </Form.Item>
      {showOther && (
        <Form.Item
          name={name + '_other'}
          className="mt-2 m-0"
          rules={[{ required: true, message: 'Please input description.' }]}
        >
          <Input placeholder="Description Text" />
        </Form.Item>
      )}
    </div>
  );
}
