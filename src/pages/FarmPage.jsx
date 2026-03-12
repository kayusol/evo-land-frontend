import React, { useState } from 'react'
import { useAccount } from 'wagmi'
import { RES_NAMES_EN, RES_EMOJIS, RES_COLORS, CONTRACTS } from '../constants/contracts.js'
import ResourceBar from '../components/ResourceBar.jsx'

// 仿截图4: 农场页面 - GOLD-RING / WOOD-RING 等池子列表
const POOLS = [
  ...RES_NAMES_EN.map((n,i) => ({ name:`${n.toUpperCase()}-RING`, icon:RES_EMOJIS[i], color:RES_COLORS[i] })),
  { name: 'WHT-RING', icon: '⚪', color: '#94a3b8' },
]

function PoolRow({ pool }) {
  const [open, setOpen] = useState(false)
  const [stakeAmt, setStakeAmt] = useState('')

  return (
    <div style={{
      background: '#1a2540',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 10, overflow: 'hidden',
      marginBottom: 10,
      transition: 'all 0.2s',
    }}>
      {/* 主行 */}
      <div
        style={{
          display: 'flex', alignItems: 'center',
          padding: '14px 20px', cursor: 'pointer',
          gap: 16,
        }}
        onClick={() => setOpen(o => !o)}
      >
        {/* 图标 */}
        <div style={{display:'flex',gap:-4,marginRight:4,flexShrink:0}}>
          <div style={{
            width:36,height:36,borderRadius:'50%',
            background: `${pool.color}22`, border:`2px solid ${pool.color}`,
            display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:18, zIndex:1,
          }}>{pool.icon}</div>
          <div style={{
            width:36,height:36,borderRadius:'50%',
            background:'rgba(167,139,250,0.15)',border:'2px solid #a78bfa',
            display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:16, marginLeft:-10,
          }}>💎</div>
        </div>

        <span style={{fontSize:15,fontWeight:700,color:'#f1f5f9',minWidth:120}}>{pool.name}</span>

        <div style={{display:'flex',gap:32,flex:1}}>
          <div>
            <div style={{fontSize:10,color:'#334155',marginBottom:2}}>质押总量</div>
            <div style={{fontSize:14,fontWeight:600,color:'#94a3b8',fontFamily:'Rajdhani,monospace'}}>0.000000</div>
          </div>
          <div>
            <div style={{fontSize:10,color:'#334155',marginBottom:2}}>APY</div>
            <div style={{fontSize:14,color:'#94a3b8'}}>--</div>
          </div>
          <div>
            <div style={{fontSize:10,color:'#334155',marginBottom:2}}>我的质押</div>
            <div style={{fontSize:14,fontWeight:600,color:'#94a3b8',fontFamily:'Rajdhani,monospace'}}>0.000000</div>
          </div>
          <div>
            <div style={{fontSize:10,color:'#334155',marginBottom:2}}>未领取</div>
            <div style={{fontSize:14,fontWeight:600,color:'#94a3b8',fontFamily:'Rajdhani,monospace'}}>0.000000</div>
          </div>
        </div>

        <span style={{color:'#334155',fontSize:18,transition:'transform .2s',transform:open?'rotate(180deg)':'none'}}>∨</span>
      </div>

      {/* 展开区域 */}
      {open && (
        <div style={{
          padding:'0 20px 16px',
          borderTop:'1px solid rgba(255,255,255,0.05)',
          display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,
        }}>
          <div>
            <div style={{fontSize:11,color:'#475569',marginBottom:6}}>质押数量</div>
            <div style={{display:'flex',gap:8}}>
              <input
                type="number" placeholder="0.000000"
                value={stakeAmt} onChange={e=>setStakeAmt(e.target.value)}
                style={{flex:1}}
              />
              <button className="btn btn-primary btn-sm">质押</button>
            </div>
          </div>
          <div>
            <div style={{fontSize:11,color:'#475569',marginBottom:6}}>待领取奖励</div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontSize:18,fontWeight:700,color:pool.color,fontFamily:'Rajdhani,monospace'}}>0.000000</span>
              <button className="btn btn-gold btn-sm">领取</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function FarmPage() {
  const { isConnected } = useAccount()
  const [tab, setTab] = useState('active')

  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',overflow:'hidden',background:'linear-gradient(180deg,#0d1a2e 0%,#0a1020 100%)'}}>
      {/* 二级标题 */}
      <div style={{
        display:'flex',alignItems:'center',
        padding:'0 20px',height:40,
        borderBottom:'1px solid rgba(255,255,255,0.06)',
        flexShrink:0,
      }}>
        <span style={{fontSize:14,fontWeight:600,color:'#e2e8f0'}}>🌾 农场</span>
      </div>

      <ResourceBar />

      <div style={{flex:1,overflowY:'auto',padding:'16px 20px'}}>
        {/* Active / Finished 切换 */}
        <div style={{display:'flex',gap:4,marginBottom:16}}>
          {['Active','Finished'].map(t=>(
            <button
              key={t}
              onClick={()=>setTab(t.toLowerCase())}
              style={{
                padding:'6px 18px', borderRadius:20,
                background: tab===t.toLowerCase() ? '#4ade80' : 'rgba(255,255,255,0.05)',
                border: '1px solid',
                borderColor: tab===t.toLowerCase() ? '#4ade80' : 'rgba(255,255,255,0.1)',
                color: tab===t.toLowerCase() ? '#0a1020' : '#64748b',
                fontWeight: tab===t.toLowerCase() ? 700 : 400,
                fontSize: 13, cursor:'pointer',
                fontFamily:'Rajdhani,sans-serif',
              }}
            >{t}</button>
          ))}
        </div>

        {tab === 'active' ? (
          POOLS.map((p,i)=><PoolRow key={i} pool={p}/>)
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🌾</div>
            <h4>暂无已结束的农场</h4>
          </div>
        )}
      </div>
    </div>
  )
}
