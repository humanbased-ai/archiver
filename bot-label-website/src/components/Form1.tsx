import { Button, Form, message } from 'antd';
import { PlusIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { groupBy, map } from 'lodash';

import SegmentCard from './cards/SegmentCard';

import { Api } from '@/api/api';

export default function Component({ max }: { max: number }) {
  const maxCard = 10;
  const [form] = Form.useForm();
  const [ends, setEnds] = useState<{ end: number; key: string }[]>([
    { end: 1, key: 'aaa' },
    { end: 2, key: 'bbb' },
    { end: 3, key: 'ccc' },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEndChange = (index: number, value: number) => {
    const newEnds = [...ends];
    newEnds[index].end = value;
    setEnds(newEnds);
  };

  const handleAddMoreParagraph = () => {
    if (ends.length >= maxCard) {
      return;
    }
    const newEnds = [...ends];
    const lastEnd = ends[ends.length - 1]?.end ?? 0;
    newEnds.push({
      end: Math.min(lastEnd + 1, max),
      key: Math.random().toString(36).substring(2, 15),
    });
    setEnds(newEnds);
  };

  const handleDeleteParagraph = (index: number) => {
    if (ends.length === 1) {
      return;
    }
    const newEnds = [...ends];
    newEnds.splice(index, 1);
    setEnds(newEnds);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const values = await form.validateFields();
      const data = convertFormValuesToArray(values);
      //   console.log('Form values:', data);

      const res = await Api.submit(1, data);
      //   console.log('Form values:', res);
      message.success('Submit successfully');
      // 在这里处理表单提交逻辑
    } catch (e: any) {
      console.log('e', e);
      e.message && message.error(e.message);
    }
    setIsSubmitting(false);
  };

  const convertFormValuesToArray = (
    formValues: Record<string, any>,
    spliter: string = ':'
  ): Array<{ start: number; end: number; des: string }> => {
    // 按照前缀分组
    const grouped = groupBy(
      Object.entries(formValues),
      ([key, value]: [string, string]) => key.split(spliter)[0]
    );

    return map(grouped, (group: [string, string][], _index: number) => {
      const parsedGroup = group.map(([key, value]: [string, string]) => [
        key.split(spliter)[1],
        key.endsWith('start') || key.endsWith('end')
          ? parseInt(value, 10)
          : value,
      ]);
      return Object.fromEntries(parsedGroup) as {
        start: number;
        end: number;
        des: string;
      };
    }) as unknown as Array<{ start: number; end: number; des: string }>;
  };

  useEffect(() => {
    Api.getHistoryGroup(1).then((res) => console.log(res));
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-4 pr-6">
        Please segment and describe the above content based on your
        understanding.
      </h2>
      <Form
        name="form1"
        layout="vertical"
        className="flex flex-col gap-6"
        form={form}
      >
        {ends.map((end, index) => (
          <SegmentCard
            key={`form1-${end.key}`}
            start={index === 0 ? 1 : ends[index - 1].end + 1}
            end={end.end}
            max={max}
            id={end.key}
            form={form}
            showClose={ends.length > 1}
            onClose={() => {
              handleDeleteParagraph(index);
            }}
            onEndChange={(max) => {
              handleEndChange(index, max);
            }}
          />
        ))}
        <div className="flex justify-between items-center bg-gray-900 p-4">
          {ends.length < maxCard ? (
            <Button
              icon={<PlusIcon />}
              className="flex items-center px-4 py-2 bg-transparent text-white text-sm font-bold rounded-full "
              disabled={ends.length >= maxCard}
              onClick={handleAddMoreParagraph}
            >
              + Add More Paragraphs
            </Button>
          ) : (
            <div></div>
          )}

          <Button
            className="rounded-full w-[160px] bg-[#875DFF]"
            type="primary"
            onClick={handleSubmit}
            loading={isSubmitting}
          >
            OK
          </Button>
        </div>
      </Form>
    </div>
  );
}
