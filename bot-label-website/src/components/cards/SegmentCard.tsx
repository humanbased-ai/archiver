import { InputNumber, Form, FormInstance, Button } from 'antd';
import { useEffect } from 'react';
import { X } from 'lucide-react';

import AutoInput from '@/components/AutoInput';

interface SegmentCardProps {
  start: number;
  end: number;
  max: number;
  id: string;
  description?: string;
  form: FormInstance;
  showClose?: boolean;
  onClose: () => void;
  onEndChange: (value: number) => void;
}
export default function SegmentCard({
  start = 0,
  end = 0,
  max = 0,
  description,
  id,
  form,
  showClose = true,
  onClose,
  onEndChange,
}: SegmentCardProps) {
  useEffect(() => {
    form.setFieldsValue({
      [`${id}:start`]: start,
      [`${id}:end`]: end,
    });
  }, [start, end, id, form]);

  useEffect(() => {
    form.setFieldsValue({
      [`${id}:des`]: description,
    });
  }, [description, form]);

  const handleEndChange = (value: number | null) => {
    if (value !== null) {
      form.setFieldsValue({
        [`${id}:end`]: value,
      });
      onEndChange(value);
    }
  };

  const handleDescriptionChange = (value: string, inputName: string) => {
    form.setFieldsValue({
      [inputName]: value,
    });
  };

  return (
    <div className="bg-[#252532] p-6 rounded-2xl shadow-md text-base text-white relative">
      {showClose && (
        <Button
          className="absolute top-2 right-2 bg-transparent border-none text-white hover:bg-[#3a3a4a] focus:bg-[#3a3a4a]"
          icon={<X />}
          onClick={onClose}
        />
      )}
      <div className="mb-3">Time</div>
      <div className="flex items-center mb-4 h-[50px] leading-[50px] text-sm">
        <Form.Item name={`${id}:start`} className="mb-0 h-8">
          <InputNumber
            placeholder="1"
            className="cursor-not-allowed"
            readOnly
          />
        </Form.Item>
        <span className="mx-2 bg-[#404049] h-[2px] block w-6"></span>
        <Form.Item
          name={`${id}:end`}
          className="mb-0 h-8"
          rules={[
            { required: true, message: 'End time is required' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue(`${id}:start`) <= value) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error('End time must be greater than start time')
                );
              },
            }),
          ]}
        >
          <InputNumber
            placeholder="1"
            min={start}
            max={max}
            onChange={handleEndChange}
          />
        </Form.Item>
      </div>
      <div className="mt-6 mb-3">Description</div>

      <Form.Item
        className="h-8"
        name={`${id}:des`}
        rules={[{ required: true, message: 'Description is required' }]}
      >
        <AutoInput
          autoComplete={false}
          onChange={(val) => handleDescriptionChange(val, `${id}:des`)}
          maxLength={200}
          showCount={false}
        />
      </Form.Item>
    </div>
  );
}
