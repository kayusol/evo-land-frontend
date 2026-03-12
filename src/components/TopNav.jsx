import React from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import './TopNav.css'

export default function TopNav({ pages, current, onChange }) {
  return (
    <nav className="top-nav">
      {/* Logo */}
      <div className="nav-logo">
        <img src="/favicon.svg" width="26" height="26" alt="logo"
          style={{ filter: 'drop-shadow(0 0 5px rgba(74,222,128,0.45))' }} />
        <div className="nav-logo-text">
          <span className="nav-logo-zh">进化星球</span>
          <span className="nav-logo-en">BSC · 单链版</span>
        </div>
      </div>

      {/* 页面导航 */}
      <div className="nav-links">
        {pages.map(p => (
          <button
            key={p.id}
            className={`nav-link ${current === p.id ? 'active' : ''}`}
            onClick={() => onChange(p.id)}
          >
            <span className="nl-icon">{p.icon}</span>
            <span className="nl-zh">{p.zh}</span>
            <span className="nl-en">{p.en}</span>
          </button>
        ))}
      </div>

      {/* 右侧连接按钮 */}
      <div className="nav-right">
        <ConnectButton
          chainStatus="icon"
          showBalance={false}
          accountStatus="address"
        />
      </div>
    </nav>
  )
}
