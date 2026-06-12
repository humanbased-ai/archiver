import { Button, Form, message } from 'antd';
import { useState } from 'react';
import { forEach } from 'lodash';

import RelationsCard from './Form3/RelationsCard';
import TaskCard from './Form3/TaskCard';

import { Api } from '@/api/api';
import ObjectsCard from './Form3/ObjectsCard';
import EnvironmentCard from './Form3/EnvironmentCard';
import AgentCard from './Form3/AgentCard';
import ViewCard from './Form3/ViewCard';

export default function Component() {
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const values = await form.validateFields();
      const data = convertObjectToArray(values);

      console.log('Form values:', values, data);
      const res = await Api.submit(3, data);
      message.success('Submit successfully');
      console.log('Form values:', res);
      // 在这里处理表单提交逻辑
    } catch (e: any) {
      console.log('Validation failed:', e);
      e.message && message.error(e.message);
    }

    setIsSubmitting(false);
  };

  function convertObjectToArray(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    const arrayFields: Record<string, any[]> = {};
    const agentType: Record<string, any> = {};
    const relations: Record<string, any> = {};

    Object.entries(obj).forEach(([key, value]) => {
      if (key.includes(':')) {
        const [baseKey, id] = key.split(':');
        const lowercasedKey = baseKey.toLowerCase();

        if (!arrayFields[lowercasedKey]) {
          arrayFields[lowercasedKey] = [];
        }

        if (lowercasedKey === 'relation' || lowercasedKey === 'agent_type') {
          const [key, property] = id.split('-');

          if (lowercasedKey === 'relation') {
            relations[key] = relations[key] || {};
            relations[key][property] = value;
          } else if (lowercasedKey === 'agent_type') {
            agentType[key] = agentType[key] || {};
            agentType[key][property] = value;
          }
        } else {
          arrayFields[lowercasedKey].push(value);
        }
      } else {
        result[key] = value;
      }
    });

    arrayFields.agent_type = Object.values(agentType);
    arrayFields.relation = Object.values(relations);

    return { ...result, ...arrayFields };
  }

  return (
    <div className="flex flex-col gap-6">
      <Form
        name="form1"
        layout="vertical"
        className="flex flex-col gap-6"
        form={form}
      >
        <ObjectsCard form={form} />
        <EnvironmentCard />
        <AgentCard />
        <ViewCard />
        <RelationsCard />
        <TaskCard form={form} />

        <div className="flex justify-end">
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
