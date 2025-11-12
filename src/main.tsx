import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './styles/index.css'
import App from './pages/App.tsx'
import SurahList from './pages/SurahList.tsx'
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SurahList />} />
        <Route path="/surah/:surahNumber" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)