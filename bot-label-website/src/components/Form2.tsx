import { Button, Form, Radio } from 'antd';

import { useEffect, useState } from 'react';

import { Api } from '@/api/api';
import { getParamFromUrl } from '@/utils/util';
import useGiftStore, {
  updateFrameDescription,
  updateFrameRange,
} from '@/stores/gifPlayerStore';
import useImageLabelStore, { toggleFocusPoint } from '@/stores/imageLabelStore';
import CoordinateInput from './Form2/CoordinateInput';
import ActionsChoice from './Form2/ActionsChoice';
import toast from '@/utils/toast';

export default function Component() {
  const [form] = Form.useForm();
  const [hasContact, setHasContact] = useState<0 | 1>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { startIndex, endIndex } = useGiftStore();
  const { rect } = useImageLabelStore();

  const handleRadioChange = (e: any) => {
    setHasContact(e.target.value);
    toggleFocusPoint(e.target.value === 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const targetAddress = getParamFromUrl('ta') as string;
      const segment = getParamFromUrl('segment') as string;
      const values = await form.validateFields();

      console.log('Form values:', values, rect);

      const res = await Api.submit(2, {
        x: rect.x,
        y: rect.y,
        angle: rect.angle,
        radius: rect.radius,
        hasContact: values.hasContact,
        actionType: values.actionType,
        startFrameIndex: startIndex,
        endFrameIndex: endIndex,
        currentFrameIndex: startIndex,
        targetAddress,
        segment,
      });
      toast.success('Submit successfully');
      // 在这里处理表单提交逻辑
    } catch (e: any) {
      console.log('e', e);
      e.message && toast.fail(e.message);
    }
    setIsSubmitting(false);
  };

  useEffect(() => {
    const targetAddress = getParamFromUrl('ta') as string;
    const segment = getParamFromUrl('segment') as string;

    if (!targetAddress)
      return toast.fail('System error: Missing parameter "ta"');
    if (!segment)
      return toast.fail('System error: Missing parameter "segment"');

    Api.getType1HistoryByAddressAndDocId(targetAddress, +segment || 0).then(
      (res) => {
        updateFrameRange(res.start, res.end);
        updateFrameDescription(res.des);
        console.log('getType1HistoryByAddressAndDocId ', res);
      }
    );
  }, []);

  return (
    <div className="text-white">
      <h2 className="text-2xl font-semibold  mb-4 pr-6">
        Complete the labeling tasks based on the left image.
      </h2>
      <Form
        name="form1"
        layout="vertical"
        className="flex flex-col gap-6 text-white"
        form={form}
        requiredMark={false}
      >
        <Form.Item
          label={
            <h2 className="text-white text-base">
              1. Is there any contact between the robot and the object?
            </h2>
          }
          name="hasContact"
          className="mb-0 "
          initialValue=""
          rules={[{ required: true, message: 'Please select one option.' }]}
        >
          <Radio.Group
            onChange={handleRadioChange}
            className="flex gap-8"
            size="small"
          >
            {[
              { value: 1, label: 'Yes' },
              { value: 0, label: 'No' },
            ].map((option) => (
              <Radio
                key={option.value}
                value={option.value}
                className="mx-0 text-white text-sm"
              >
                {option.label}
              </Radio>
            ))}
          </Radio.Group>
        </Form.Item>
        {hasContact ? (
          <>
            <CoordinateInput />
            <ActionsChoice />
          </>
        ) : (
          <></>
        )}
        <Button
          className="rounded-full bg-[#875DFF] w-full"
          type="primary"
          onClick={handleSubmit}
          loading={isSubmitting}
        >
          OK
        </Button>
      </Form>
    </div>
  );
}
