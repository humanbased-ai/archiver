import { cn } from '@udecode/cn';
import { Button, Form, FormInstance } from 'antd';
import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import AutoInput from '../AutoInput';

interface RelationsCardProps {
  name: string;
  title: string;
  des: string;
  buttonText?: string;
  maxInputs?: number;
  maxWords?: number;
  defaultInputs?: string[];
  form: FormInstance;
}

export default function RelationsCard({
  name,
  title,
  des,
  buttonText,
  maxInputs = 8,
  maxWords = 45,
  form,
  defaultInputs = ['a'],
}: RelationsCardProps) {
  const countRef = useRef(0);
  const [inputs, setInputs] = useState<string[]>(defaultInputs);
  const handleAdd = () => {
    countRef.current += 1;
    setInputs([...inputs, countRef.current.toString()]);
  };
  const handleDelete = (index: number) => {
    const newInputs = [...inputs];
    newInputs.splice(index, 1);
    setInputs(newInputs);
  };

  const handleDescriptionChange = (value: string, inputName: string) => {
    form.setFieldsValue({
      [inputName]: value,
    });
  };

  return (
    <div className="rounded-2xl bg-[#252532] p-6 relative">
      <h2 className="font-semibold text-base text-white">{title}</h2>
      <p className="text-sm text-[#BBBBBE] mt-2 mb-6 p-0">{des}</p>
      {inputs.map((input, index) => (
        <div className="flex items-center mb-3" key={`${name}-${input}`}>
          <Form.Item
            name={`${name}:${input}`}
            className="flex-1 mb-0"
            rules={[{ required: true, message: 'Description is required' }]}
          >
            <AutoInput
              autoComplete={false}
              onChange={(val) =>
                handleDescriptionChange(val, `${name}:${input}`)
              }
              placeholder="Description Text"
              maxLength={maxWords}
              showCount={false}
            />
          </Form.Item>
          <Button
            icon={<X className="text-white hover:text-[#ea580c]"></X>}
            onClick={() => (inputs.length == 1 ? null : handleDelete(index))}
            color="danger"
            type="text"
            className={cn(
              'bg-transparent border-none text-white hover:bg-transparent ',
              inputs.length == 1 && 'invisible'
            )}
          ></Button>
        </div>
      ))}

      {inputs.length < maxInputs && buttonText && (
        <Button
          className="flex items-center px-4 py-2 bg-transparent text-white text-sm rounded-full"
          onClick={handleAdd}
        >
          {buttonText}
        </Button>
      )}
    </div>
  );
}
