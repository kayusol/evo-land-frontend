import React from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import './TopNav.css'

export default function TopNav({ pages, current, onChange }) {
  return (
    <nav className="top-nav">
      <div className="top-nav-logo">
        <img src="/favicon.svg" width="28" height="28" alt="logo" style={{ filter:'drop-shadow(0 0 6px rgba(74,222,128,0.5))' }} />
        <div>
          <div className="logo-title">进化星球</div>
          <div className="logo-sub">BSC · 单链版</div>
        </div>
      </div>

      <div className="top-nav-links">
        {pages.map(p => (
          <button
            key={p.id}
            className={`nav-link ${current === p.id ? 'active' : ''}`}
            onClick={() => onChange(p.id)}
          >
            <span className="nav-icon">{p.icon}</span>
            <span className="nav-zh">{p.zh}</span>
            <span className="nav-en">{p.en}</span>
          </button>
        ))}
      </div>

      <div className="top-nav-right">
        <ConnectButton chainStatus="icon" showBalance={false} />
      </div>
    </nav>
  )
}
