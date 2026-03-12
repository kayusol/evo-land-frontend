import React, { useState } from 'react'
import TopNav from './components/TopNav.jsx'
import WorldMap from './pages/WorldMap.jsx'
import MarketPage from './pages/MarketPage.jsx'
import FarmPage from './pages/FarmPage.jsx'
import AssetsPage from './pages/AssetsPage.jsx'
import SwapPage from './pages/SwapPage.jsx'
import Toast from './components/Toast.jsx'
import { ToastProvider } from './contexts/ToastContext.jsx'
import './App.css'

const PAGES = [
  { id: 'map',    zh: '地图',  en: 'Map',    icon: '🌍' },
  { id: 'market', zh: '市场',  en: 'Market', icon: '🏛' },
  { id: 'farm',   zh: '农场',  en: 'Farm',   icon: '🌾' },
  { id: 'swap',   zh: '兑换',  en: 'Swap',   icon: '🔄' },
  { id: 'assets', zh: '资产',  en: 'Assets', icon: '💎' },
]

function AppInner() {
  const [page, setPage] = useState('map')
  const views = {
    map:    <WorldMap />,
    market: <MarketPage />,
    farm:   <FarmPage />,
    swap:   <SwapPage />,
    assets: <AssetsPage />,
  }
  return (
    <div className="app-root">
      <TopNav pages={PAGES} current={page} onChange={setPage} />
      <main className="app-main">
        <div className="fade-up" key={page} style={{ height: '100%' }}>
          {views[page]}
        </div>
      </main>
      <Toast />
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  )
}
