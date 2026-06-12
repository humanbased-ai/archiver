import { Route, BrowserRouter, Routes } from 'react-router-dom'
import { lazy } from 'react'
import AppLayout from '@/layouts/app-layout'

// index home
const Home = lazy(() => import('@/views/home'))


export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<AppLayout />}>
          <Route index element={<Home />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
