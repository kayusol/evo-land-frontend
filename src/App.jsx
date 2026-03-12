import React, { useState } from 'react'
import TopNav from './components/TopNav.jsx'
import WorldMap from './pages/WorldMap.jsx'
import MyLands from './pages/MyLands.jsx'
import Mining from './pages/Mining.jsx'
import AuctionPage from './pages/AuctionPage.jsx'
import Inventory from './pages/Inventory.jsx'
import Toast from './components/Toast.jsx'
import { ToastProvider } from './contexts/ToastContext.jsx'
import './App.css'

const PAGES = [
  { id: 'map',       zh: '地图',   en: 'Map',       icon: '🌍' },
  { id: 'mylands',   zh: '我的地块', en: 'My Lands',   icon: '🏔' },
  { id: 'mining',    zh: '挖矿',   en: 'Mining',     icon: '⛏' },
  { id: 'auction',   zh: '拍卖',   en: 'Auction',    icon: '🏛' },
  { id: 'inventory', zh: '资产',   en: 'Inventory',  icon: '💎' },
]

function AppInner() {
  const [page, setPage] = useState('map')
  const pages = {
    map:       <WorldMap />,
    mylands:   <MyLands />,
    mining:    <Mining />,
    auction:   <AuctionPage />,
    inventory: <Inventory />,
  }
  return (
    <div className="app-root">
      <TopNav pages={PAGES} current={page} onChange={setPage} />
      <main className="app-main">
        <div className="fade-in" key={page}>{pages[page]}</div>
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
