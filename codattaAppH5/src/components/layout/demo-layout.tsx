import { Outlet } from 'react-router-dom'

export default function DemoLayout() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Outlet />
    </div>
  )
}
