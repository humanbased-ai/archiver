import { Route, BrowserRouter, Routes } from 'react-router-dom'

import HomePage from '@/views/home'

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage></HomePage>} />
      </Routes>
    </BrowserRouter>
  )
}
