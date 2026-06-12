import { truncateStr } from '@/utils/str'

export default function Section() {
  return (
    <header className="border-b-solid border-b-[1px] border-b-purple-100 bg-gradient-to-b from-[#983CE900] to-[#983CE90A] p-4">
      <h3 className="text-xl font-extrabold text-white">{truncateStr('TYXGsCJG9c3cPQxEKDpu3p4nJbxn3LJ2K2')}</h3>
      <div className="mt-2 grid grid-cols-4 text-xs leading-5 tracking-tighter text-gray-200">
        <span className="col-span-1">Category：</span>
        <span className="col-span-3">Example</span>
        <span className="col-span-1">Entity：</span>
        <span className="col-span-3">Example</span>
        <span className="col-span-1">Data Source：</span>
        <span className="col-span-3">Example</span>
      </div>
    </header>
  )
}
