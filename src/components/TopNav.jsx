import React from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import './TopNav.css'

export default function TopNav({ pages, current, onChange }) {
  return (
    <nav className="top-nav">
      {/* Logo - 原版风格 */}
      <div className="nav-logo">
        <div className="nav-logo-icon">⬡</div>
        <div className="nav-logo-text">
          <span className="nav-logo-main">EVOLUTION LAND</span>
          <span className="nav-logo-sub">BSC Edition</span>
        </div>
      </div>

      {/* 主导航 - 仿原版图标+文字 */}
      <div className="nav-links">
        {pages.map(p => (
          <button
            key={p.id}
            className={`nav-link${current === p.id ? ' active' : ''}`}
            onClick={() => onChange(p.id)}
          >
            <span className="nl-icon">{p.icon}</span>
            <span className="nl-label">{p.zh}</span>
          </button>
        ))}
      </div>

      <div className="nav-right">
        <ConnectButton chainStatus="icon" showBalance={false} accountStatus="short" />
      </div>
    </nav>
  )
}
