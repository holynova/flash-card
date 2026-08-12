import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { Loading } from './components/Feedback'
import { useAuth } from './contexts/AuthContext'
import { DeckDetailPage } from './pages/DeckDetailPage'
import { DecksPage } from './pages/DecksPage'
import { ImportPage } from './pages/ImportPage'
import { LoginPage } from './pages/LoginPage'
import { MePage } from './pages/MePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { StaticPage } from './pages/StaticPage'
import { StudyPage } from './pages/StudyPage'
import { TodayPage } from './pages/TodayPage'

function ProtectedRoutes() {
  const { session, loading, isDemo } = useAuth()
  if (loading) return <Loading label="正在打开资料库" />
  if (!isDemo && !session) return <Navigate to="/login" replace />
  return <AppShell />
}

function ProtectedStudy() {
  const { session, loading, isDemo } = useAuth()
  if (loading) return <Loading label="正在打开学习队列" />
  if (!isDemo && !session) return <Navigate to="/login" replace />
  return <StudyPage />
}

export function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/privacy" element={<StaticPage type="privacy" />} />
        <Route path="/terms" element={<StaticPage type="terms" />} />
        <Route path="/study" element={<ProtectedStudy />} />
        <Route element={<ProtectedRoutes />}>
          <Route index element={<TodayPage />} />
          <Route path="decks" element={<DecksPage />} />
          <Route path="decks/:deckId" element={<DeckDetailPage />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="me" element={<MePage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
