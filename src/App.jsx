import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DataProvider } from './context/DataContext'
import { ToastProvider } from './components/Toaster'
import UploadPage from './pages/UploadPage'
import EditorPage from './pages/EditorPage'

export default function App() {
  return (
    <ToastProvider>
      <DataProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<UploadPage />} />
            <Route path="/edit" element={<EditorPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </DataProvider>
    </ToastProvider>
  )
}
