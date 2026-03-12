import React, { useState } from 'react'
import { useAccount, usePublicClient, useWalletClient, useReadContract } from 'wagmi'
import { formatEther, parseEther, getContract, maxUint256 } from 'viem'
import { CONTRACTS, RES_NAMES_EN, RES_EMOJIS, RES_COLORS, isDeployed } from '../constants/contracts.js'
import { ERC20_ABI } from '../constants/abi.js'
import { useToast } from '../contexts/ToastContext.jsx'
import './FarmPage.css'

const POOLS = [
  { id: 'gold',  label: 'GOLD-RING',  emoji: '🪙', color: '#fbbf24', resIdx: 0 },
  { id: 'wood',  label: 'WOOD-RING',  emoji: '🌲', color: '#4ade80', resIdx: 1 },
  { id: 'water', label: 'WATER-RING', emoji: '💧', color: '#38bdf8', resIdx: 2 },
  { id: 'fire',  label: 'FIRE-RING',  emoji: '🔥', color: '#f87171', resIdx: 3 },
  { id: 'soil',  label: 'SOIL-RING',  emoji: '⛰',  color: '#a78bfa', resIdx: 4 },
  { id: 'ring',  label: 'WHT-RING',   emoji: '💎', color: '#c084fc', resIdx: -1 },
]

function PoolRow({ pool }) {
  const [open, setOpen] = useState(false)
  const [amt, setAmt]   = useState('')
  const { address }     = useAccount()
  const { toast }       = useToast()
  const dep = isDeployed('ring')

  return (
    <div className={`fp-row ${open ? 'open' : ''}`}>
      <div className="fp-row-main" onClick={() => setOpen(o => !o)}>
        {/* 图标 */}
        <div className="fp-icon">
          <div className="fp-icon-a" style={{ background: pool.color + '33', border: `2px solid ${pool.color}55` }}>
            <span style={{ fontSize: 18 }}>{pool.emoji}</span>
          </div>
          <div className="fp-icon-b">
            <span style={{ fontSize: 18 }}>💎</span>
          </div>
        </div>
        <div className="fp-label">{pool.label}</div>
        <div className="fp-col">
          <div className="fp-col-lbl">質押總量</div>
          <div className="fp-col-val">0.000000</div>
        </div>
        <div className="fp-col">
          <div className="fp-col-lbl">APY</div>
          <div className="fp-col-val fp-apy">--</div>
        </div>
        <div className="fp-col">
          <div className="fp-col-lbl">我的質押</div>
          <div className="fp-col-val">0.000000</div>
        </div>
        <div className="fp-col">
          <div className="fp-col-lbl">未領取</div>
          <div className="fp-col-val">0.000000</div>
        </div>
        <div className={`fp-arrow ${open ? 'up' : ''}`}>▾</div>
      </div>

      {open && (
        <div className="fp-expand">
          <div className="fp-exp-grid">
            <div className="fp-exp-box">
              <div className="fp-exp-lbl">質押 {pool.label}</div>
              <div className="fp-exp-input-row">
                <input
                  type="number" placeholder="0.00"
                  value={amt} onChange={e => setAmt(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button className="btn btn-sm" onClick={() => setAmt('0')}>MAX</button>
              </div>
              <button className="btn btn-primary btn-sm fp-exp-btn"
                disabled={!address || !amt || !dep}
              >
                {dep ? '質押' : '合約未部署'}
              </button>
            </div>
            <div className="fp-exp-box">
              <div className="fp-exp-lbl">解除質押</div>
              <div className="fp-exp-input-row">
                <input type="number" placeholder="0.00" style={{ flex: 1 }} />
                <button className="btn btn-sm">MAX</button>
              </div>
              <button className="btn btn-danger btn-sm fp-exp-btn" disabled={!address || !dep}>
                解除
              </button>
            </div>
            <div className="fp-exp-box" style={{ alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <div className="fp-exp-lbl" style={{ textAlign: 'center' }}>待領取 Pending</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#4ade80', fontFamily: 'Rajdhani, monospace' }}>0.0000</div>
              <div style={{ fontSize: 11, color: '#334155' }}>RING</div>
              <button className="btn btn-gold btn-sm" disabled={!address || !dep}>領取</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function FarmPage() {
  const [tab, setTab] = useState('active')
  return (
    <div className="fp-root">
      <div className="fp-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🌾</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>農場</span>
          <span style={{ fontSize: 10, color: '#2d3748', fontFamily: 'Rajdhani, sans-serif' }}>FARM · LP Mining</span>
        </div>
      </div>

      <div style={{ padding: '12px 20px 0', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[['active','Active'],['finished','Finished']].map(([id,l]) => (
            <button key={id} className={`tab-item ${tab===id?'active':''}`} onClick={() => setTab(id)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="fp-list">
        {tab === 'active' ? (
          POOLS.map(p => <PoolRow key={p.id} pool={p} />)
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🌾</div>
            <h4>暫無已結束的農場</h4>
          </div>
        )}
      </div>
    </div>
  )
}
