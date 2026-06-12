import { Api } from '@/api/api';
import { Divider, Table, TableProps, Tabs, TabsProps, Tag } from 'antd';
import { useEffect, useState } from 'react';

type ColumnsType<T extends object> = TableProps<T>['columns'];

interface DataType {
  key: string;
  docId: string;
  count: number;
  complete: boolean;
  addresses: string[];
}

const columns: ColumnsType<DataType> = [
  {
    title: 'Doc Id',
    dataIndex: 'docId',
    key: 'docId',
  },
  {
    title: 'Count',
    dataIndex: 'count',
    key: 'count',
  },
  {
    title: 'Complete',
    key: 'complete',
    dataIndex: 'complete',
    render: (complete: boolean) => (
      <Tag
        color={complete ? '#22c55e' : 'volcano'}
        key={complete ? 'true' : 'false'}
      >
        {complete ? 'Complete' : 'Incomplete'}
      </Tag>
    ),
  },
  {
    title: 'Addresses',
    key: 'addresses',
    dataIndex: 'addresses',
    render: (_, record) => (
      <div className="whitespace-pre-line">
        {record.addresses
          .map((address, index) => index + 1 + '. ' + address)
          .join('\n')}
      </div>
    ),
  },
];

const ResultPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState('2.0');
  const [data1, setData1] = useState<DataType[]>([]);
  const [data3, setData3] = useState<DataType[]>([]);

  const items: TabsProps['items'] = [
    {
      key: '2.0',
      label: 'MVP 2.0',
      children: '',
    },
    {
      key: '1.0',
      label: 'MVP 1.0',
      children: '',
    },
  ];

  async function getData(version?: string) {
    setLoading(true);
    Api.getHistoryGroup(1, undefined, undefined, version).then((res) => {
      const data = Object.entries(res.docs || {}).map(([key, addresses]) => ({
        key: '1' + key,
        docId: key,
        addresses,
        count: addresses.length,
        complete: addresses.length >= 10,
      }));
      setData1(data);
      console.log('getHistoryGroup 1', data);
    });
    Api.getHistoryGroup(3, undefined, undefined, version).then((res) => {
      const data = Object.entries(res.docs || {}).map(([key, addresses]) => ({
        key: '3' + key,
        docId: key,
        addresses,
        count: addresses.length,
        complete: addresses.length >= 10,
      }));
      setData3(data);
      console.log('getHistoryGroup 3', data);
    });
    setLoading(false);
  }

  const onChange = async (key: string) => {
    setVersion(key);
  };

  useEffect(() => {
    getData(version === '2.0' ? 'mvp-2.0' : undefined);
  }, [version]);

  return (
    <div className="flex flex-col min-h-screen">
      <div className="p-6 max-w-4xl mx-auto">
        <Tabs
          defaultActiveKey="1"
          items={items}
          onChange={onChange}
          className="[&_.ant-tabs-tab-btn]:text-white"
        />
      </div>
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Bot Label 1</h1>
        <Divider orientation="left" plain />
        <Table
          columns={columns}
          dataSource={data1}
          className="shadow-lg w-[1000px]"
          pagination={false}
        />
      </div>
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Bot Label 3</h1>
        <Table
          columns={columns}
          dataSource={data3}
          className="shadow-lg w-[1000px]"
          pagination={false}
        />
      </div>
    </div>
  );
};

export default ResultPage;
