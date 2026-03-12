import React, { useState } from 'react'
import TopNav from './components/TopNav.jsx'
import WorldMap from './pages/WorldMap.jsx'
import AuctionPage from './pages/AuctionPage.jsx'
import FarmPage from './pages/FarmPage.jsx'
import AssetsPage from './pages/AssetsPage.jsx'
import Mining from './pages/Mining.jsx'
import Toast from './components/Toast.jsx'
import { ToastProvider } from './contexts/ToastContext.jsx'
import './App.css'

const PAGES = [
  { id: 'map',     zh: '遊戲', en: 'Game',   icon: '🎮' },
  { id: 'auction', zh: '市場', en: 'Market',  icon: '🏛' },
  { id: 'farm',    zh: '農場', en: 'Farm',    icon: '🌾' },
  { id: 'assets',  zh: '資產', en: 'Assets',  icon: '💎' },
]

function AppInner() {
  const [page, setPage] = useState('map')
  const views = {
    map:     <WorldMap />,
    auction: <AuctionPage />,
    farm:    <FarmPage />,
    assets:  <AssetsPage />,
  }
  return (
    <div className="app-root">
      <TopNav pages={PAGES} current={page} onChange={setPage} />
      {/* 二级导航栏 (仿原版 地图/熔雄 或 地块/使徒等) */}
      {page === 'map' && (
        <div className="sub-nav">
          <button className="sub-nav-item active">🗺 地图</button>
          <button className="sub-nav-item">🔥 熔雄</button>
        </div>
      )}
      <main className="app-main">
        <div key={page} className="fade-up" style={{height:'100%'}}>
          {views[page]}
        </div>
      </main>
      <Toast />
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider><AppInner /></ToastProvider>
  )
}
