import React, { useState } from 'react'
import Header from './components/Header.jsx'
import Sidebar from './components/Sidebar.jsx'
import LandMap from './pages/LandMap.jsx'
import MyLands from './pages/MyLands.jsx'
import Mining from './pages/Mining.jsx'
import Auction from './pages/Auction.jsx'
import Inventory from './pages/Inventory.jsx'
import './App.css'

const PAGES = [
  { id: 'map',       label: 'WORLD MAP',  icon: '🗺',  desc: 'Explore' },
  { id: 'mylands',   label: 'MY LANDS',   icon: '🏔',  desc: 'Manage' },
  { id: 'mining',    label: 'MINING',     icon: '⛏',  desc: 'Harvest' },
  { id: 'auction',   label: 'AUCTION',    icon: '🏛',  desc: 'Trade' },
  { id: 'inventory', label: 'INVENTORY',  icon: '🎒',  desc: 'Assets' },
]

export default function App() {
  const [page, setPage] = useState('map')
  const render = () => {
    switch(page) {
      case 'map':       return <LandMap />
      case 'mylands':   return <MyLands />
      case 'mining':    return <Mining />
      case 'auction':   return <Auction />
      case 'inventory': return <Inventory />
      default:          return <LandMap />
    }
  }
  return (
    <div className="app-shell">
      <div className="nebula" />
      <Header />
      <div className="app-body">
        <Sidebar pages={PAGES} current={page} onChange={setPage} />
        <main className="app-main">
          <div className="fade-up" key={page}>{render()}</div>
        </main>
      </div>
    </div>
  )
}
