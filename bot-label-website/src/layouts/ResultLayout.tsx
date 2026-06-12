import { Outlet } from 'react-router-dom';
import Header from '@/components/Header';

export default function AppLayout() {
  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col">
      <Header />
      <Outlet />
    </div>
  );
}
