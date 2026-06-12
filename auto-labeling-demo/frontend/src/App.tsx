import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import UploadPage from './pages/UploadPage'
import ProcessingPage from './pages/ProcessingPage'
import AnnotatePage from './pages/AnnotatePage'
import ExportPage from './pages/ExportPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/processing/:videoId" element={<ProcessingPage />} />
        <Route path="/annotate/:videoId" element={<AnnotatePage />} />
        <Route path="/export/:videoId" element={<ExportPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
