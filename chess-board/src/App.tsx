import { Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import VsPlayerPage from './pages/VsPlayerPage'
import VsStockfishPage from './pages/VsStockfishPage'
import OnlineGamePage from './pages/OnlineGamePage'
import ReviewPage from './pages/ReviewPage'
import './App.css'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/vs-player" element={<VsPlayerPage />} />
      <Route path="/vs-bot" element={<VsStockfishPage />} />
      <Route path="/game/:id" element={<OnlineGamePage />} />
      <Route path="/review" element={<ReviewPage />} />
    </Routes>
  )
}

