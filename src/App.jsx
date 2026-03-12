import React, { useState } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import Header from './components/Header.jsx'
import Sidebar from './components/Sidebar.jsx'
import LandMap from './pages/LandMap.jsx'
import MyLands from './pages/MyLands.jsx'
import Mining from './pages/Mining.jsx'
import Auction from './pages/Auction.jsx'
import Inventory from './pages/Inventory.jsx'
import Toast from './components/Toast.jsx'
import { ToastProvider } from './contexts/ToastContext.jsx'

const PAGES = [
  { id:'map',       label:'World Map',  icon:'⬡' },
  { id:'mylands',   label:'My Lands',   icon:'◈' },
  { id:'mining',    label:'Mining',     icon:'⛏' },
  { id:'auction',   label:'Auction',    icon:'◉' },
  { id:'inventory', label:'Inventory',  icon:'✦' },
]

function AppInner() {
  const [page, setPage] = useState('map')
  const pages = { map:<LandMap/>, mylands:<MyLands/>, mining:<Mining/>, auction:<Auction/>, inventory:<Inventory/> }
  return (
    <div style={{display:'flex',flexDirection:'column',minHeight:'100vh'}}>
      {/* Grid background */}
      <div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:0,
        backgroundImage:`
          linear-gradient(rgba(0,255,136,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,255,136,0.03) 1px, transparent 1px)
        `,
        backgroundSize:'40px 40px',
        backgroundPosition:'center center'
      }}/>
      {/* Radial glow */}
      <div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:0,
        background:'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(0,255,136,0.04) 0%, transparent 70%)'
      }}/>
      <Header pages={PAGES} current={page} onChange={setPage}/>
      <div style={{display:'flex',flex:1,position:'relative',zIndex:1}}>
        <Sidebar pages={PAGES} current={page} onChange={setPage}/>
        <main style={{flex:1,overflowY:'auto'}}>
          <div className="fade-up" key={page} style={{padding:'24px 28px',maxWidth:1440,margin:'0 auto'}}>
            {pages[page]}
          </div>
        </main>
      </div>
      <Toast/>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner/>
    </ToastProvider>
  )
}
