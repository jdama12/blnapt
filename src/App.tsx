import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AdminPage from './pages/AdminPage'
import AdminLoginPage from './pages/AdminLoginPage'
import AdminResetPasswordPage from './pages/AdminResetPasswordPage'
import ComplaintsPage from './pages/ComplaintsPage'
import DashboardPage from './pages/DashboardPage'
import FeesPage from './pages/FeesPage'
import LoginPage from './pages/LoginPage'
import MyPage from './pages/MyPage'
import NoticesPage from './pages/NoticesPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/reset-password" element={<AdminResetPasswordPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/complaints" element={<ComplaintsPage />} />
        <Route path="/notices" element={<NoticesPage />} />
        <Route path="/fees" element={<FeesPage />} />
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <div id="toast" className="toast" role="status" aria-live="polite" />
    </BrowserRouter>
  )
}

export default App
