import React, { useState, useEffect } from 'react'
import { useAccount, usePublicClient, useReadContract } from 'wagmi'
import { formatEther, getContract } from 'viem'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import {
  CONTRACTS, RES_KEYS, RES_NAMES_ZH, RES_NAMES_EN,
  RES_EMOJIS, RES_COLORS, LAND_COLORS, isDeployed
} from '../constants/contracts.js'
import { APOSTLE_ABI, DRILL_ABI, ERC20_ABI, LAND_ABI } from '../constants/abi.js'
import { useToast } from '../contexts/ToastContext.jsx'
import ResourceBar from '../components/ResourceBar.jsx'

const ZERO = '0x0000000000000000000000000000000000000000'

// ── Token子页 ──────────────────────────────────────────────────
function TokenPage() {
  const { address } = useAccount()
  const RING_ADDR = CONTRACTS.ring
  const { data: ringBal } = useReadContract({
    address: RING_ADDR, abi: ERC20_ABI, functionName: 'balanceOf',
    args: [address], query: { enabled: !!address && RING_ADDR !== ZERO },
  })
  const ringV = ringBal ? parseFloat(formatEther(ringBal)).toFixed(2) : '0.00'

  const RES_COIN_ICONS = ['🟡','🟢','🔵','🔴','🟣']
  const LP_PAIRS = RES_NAMES_EN.map((n,i) => ({ name: `${n.toUpperCase()}-RING`, icon: RES_EMOJIS[i], color: RES_COLORS[i] }))

  return (
    <div style={{maxWidth:620,margin:'0 auto',padding:'20px 16px'}}>
      {/* RING 大卡片 */}
      <div style={{
        background:'#1a2540', border:'1px solid rgba(255,255,255,0.08)',
        borderRadius:12, padding:'16px 20px', marginBottom:20,
      }}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
          <div style={{
            width:38,height:38,borderRadius:'50%',
            background:'rgba(167,139,250,0.15)',
            border:'2px solid #a78bfa',
            display:'flex',alignItems:'center',justifyContent:'center',fontSize:18
          }}>💎</div>
          <span style={{fontSize:16,fontWeight:700,color:'#f1f5f9'}}>RING</span>
          <span style={{fontSize:20,color:'🔄'}}>🔄</span>
        </div>
        <div style={{fontSize:28,fontWeight:800,color:'#f1f5f9',fontFamily:'Rajdhani,monospace'}}>{ringV}</div>
        <button className="btn btn-sm" style={{width:'100%',marginTop:12}}>转账</button>
      </div>

      {/* 5种资源代币 */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(100px,1fr))',gap:10,marginBottom:20}}>
        {RES_KEYS.map((k,i)=>(
          <TokenCard key={k} name={RES_NAMES_EN[i].toUpperCase()} icon={RES_EMOJIS[i]} color={RES_COLORS[i]} addr={CONTRACTS[k]} />
        ))}
      </div>

      {/* LP代币 */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(100px,1fr))',gap:10}}>
        {LP_PAIRS.map((lp,i)=>(
          <div key={i} style={{
            background:'#1a2540', border:'1px solid rgba(255,255,255,0.07)',
            borderRadius:10, padding:'12px 10px', textAlign:'center',
          }}>
            <div style={{fontSize:26,marginBottom:6}}>
              <span style={{fontSize:16}}>{lp.icon}</span>
              <span style={{fontSize:12,color:'#a78bfa'}}>⊕</span>
            </div>
            <div style={{fontSize:11,color:lp.color,fontWeight:700}}>{lp.name}</div>
            <div style={{fontSize:18,fontWeight:800,color:'#f1f5f9',margin:'4px 0',fontFamily:'Rajdhani,monospace'}}>0.00</div>
            <button className="btn btn-xs" style={{width:'100%',marginTop:6}}>转账</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function TokenCard({name,icon,color,addr}) {
  const {address} = useAccount()
  const {data} = useReadContract({
    address: addr, abi: ERC20_ABI, functionName:'balanceOf',
    args:[address], query:{enabled:!!address&&addr!==ZERO}
  })
  const v = data ? parseFloat(formatEther(data)).toFixed(2) : '0.00'
  return (
    <div style={{
      background:'#1a2540', border:'1px solid rgba(255,255,255,0.07)',
      borderRadius:10, padding:'12px 10px', textAlign:'center',
    }}>
      <div style={{fontSize:28,marginBottom:5}}>{icon}</div>
      <div style={{fontSize:11,color,fontWeight:700}}>{name}</div>
      <div style={{fontSize:18,fontWeight:800,color:'#f1f5f9',margin:'4px 0',fontFamily:'Rajdhani,monospace'}}>{v}</div>
      <button className="btn btn-xs" style={{width:'100%',marginTop:6}}>转账</button>
    </div>
  )
}

// ── 空状态组件 (仿原版蓝色小人) ─────────────────────────────────
function EvoEmpty({text='空空如也', action, actionLabel}) {
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'60px 20px',gap:12}}>
      <div style={{fontSize:64,lineHeight:1}}>🫧</div>
      <div style={{fontSize:14,color:'#475569'}}>{text}</div>
      {action && (
        <button className="btn btn-primary" style={{marginTop:4}} onClick={action}>{actionLabel}</button>
      )}
    </div>
  )
}

// ── 地块子页 ──────────────────────────────────────────────────
function LandsPage() {
  const dep = isDeployed('land')
  return (
    <div style={{display:'flex',height:'100%',overflow:'hidden'}}>
      {/* 左侧筛选 - 仿原版 */}
      <div style={{
        width:150, flexShrink:0,
        padding:'12px 14px',
        borderRight:'1px solid rgba(255,255,255,0.06)',
        background:'rgba(8,14,28,0.5)',
        overflowY:'auto',
      }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
          <span style={{fontSize:12,color:'#94a3b8',fontWeight:600}}>筛选</span>
          <button className="btn btn-xs" style={{fontSize:10,padding:'2px 6px'}}>重置筛选项</button>
        </div>
        <FilterGroup title="土地类型">
          <FilterItem>普通</FilterItem>
          <FilterItem>保留地</FilterItem>
          <FilterItem>神秘地</FilterItem>
        </FilterGroup>
        <FilterGroup title="元素类型">
          <FilterItem>GOLD</FilterItem>
          <FilterItem>WOOD</FilterItem>
          <FilterItem>WATER</FilterItem>
          <FilterItem>FIRE</FilterItem>
          <FilterItem>SOIL</FilterItem>
        </FilterGroup>
        <FilterGroup title="价格">
          <div style={{display:'flex',gap:4,alignItems:'center'}}>
            <input placeholder="最小" style={{width:50,padding:'3px 5px',fontSize:11,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:4,color:'#94a3b8'}}/>
            <span style={{color:'#334155'}}>→</span>
            <input placeholder="最大" style={{width:50,padding:'3px 5px',fontSize:11,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:4,color:'#94a3b8'}}/>
          </div>
        </FilterGroup>
      </div>
      {/* 主内容 */}
      <div style={{flex:1,overflowY:'auto'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 16px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          {['我的地块','出价','售卖中','未领取'].map((t,i)=>(
            <button key={i} className={`tab-item${i===0?' active':''}`}>{t}</button>
          ))}
          <div style={{marginLeft:'auto',display:'flex',gap:8}}>
            <select className="btn btn-xs"><option>价格</option></select>
            <select className="btn btn-xs"><option>升序</option></select>
          </div>
        </div>
        {!dep ? (
          <div style={{padding:16}}>
            <div className="notice-bar"><span className="notice-icon">⚠</span>合约未部署，请填写 src/constants/contracts.js</div>
          </div>
        ) : (
          <EvoEmpty text="空空如也" action={()=>{}} actionLabel="购买地块" />
        )}
      </div>
    </div>
  )
}

// ── 使徒子页 ──────────────────────────────────────────────────
function ApostlePage() {
  return (
    <div style={{display:'flex',height:'100%',overflow:'hidden'}}>
      <div style={{
        width:150,flexShrink:0,padding:'12px 14px',
        borderRight:'1px solid rgba(255,255,255,0.06)',
        background:'rgba(8,14,28,0.5)',overflowY:'auto',
      }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
          <span style={{fontSize:12,color:'#94a3b8',fontWeight:600}}>筛选</span>
          <button className="btn btn-xs" style={{fontSize:10,padding:'2px 6px'}}>重置筛选项</button>
        </div>
        <FilterGroup title="元素偏好">
          {['GOLD','WOOD','WATER','FIRE','SOIL'].map(t=><FilterItem key={t}>{t}</FilterItem>)}
        </FilterGroup>
        <FilterGroup title="职业">
          <FilterItem>剑士</FilterItem>
          <FilterItem>卫士</FilterItem>
          <FilterItem>普通</FilterItem>
        </FilterGroup>
        <FilterGroup title="代际">
          <input type="range" min={0} max={100} style={{width:'100%',marginTop:4}}/>
        </FilterGroup>
      </div>
      <div style={{flex:1,overflowY:'auto'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 16px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          {['我的使徒','出售中','待相亲','待招募','已出价','未领取'].map((t,i)=>(
            <button key={i} className={`tab-item${i===0?' active':''}`} style={{fontSize:12}}>{t}</button>
          ))}
          <div style={{marginLeft:'auto',display:'flex',gap:8}}>
            <select className="btn btn-xs"><option>时间</option></select>
            <select className="btn btn-xs"><option>升序</option></select>
          </div>
        </div>
        <EvoEmpty text="空空如也" action={()=>{}} actionLabel="购买使徒" />
      </div>
    </div>
  )
}

// ── 钻头子页 ──────────────────────────────────────────────────
function DrillPage() {
  return (
    <div style={{display:'flex',height:'100%',overflow:'hidden'}}>
      <div style={{
        width:150,flexShrink:0,padding:'12px 14px',
        borderRight:'1px solid rgba(255,255,255,0.06)',
        background:'rgba(8,14,28,0.5)',overflowY:'auto',
      }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
          <span style={{fontSize:12,color:'#94a3b8',fontWeight:600}}>筛选</span>
          <button className="btn btn-xs" style={{fontSize:10,padding:'2px 6px'}}>重置筛选项</button>
        </div>
      </div>
      <div style={{flex:1,overflowY:'auto'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 16px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          {['全部','闲置','工作中'].map((t,i)=>(
            <button key={i} className={`tab-item${i===0?' active':''}`}>{t}</button>
          ))}
          <div style={{marginLeft:'auto',display:'flex',gap:8}}>
            <select className="btn btn-xs"><option>稀有度</option></select>
            <select className="btn btn-xs"><option>默认</option></select>
          </div>
        </div>
        <EvoEmpty text="空空如也" />
      </div>
    </div>
  )
}

// ── 领取子页 (仿截图9) ──────────────────────────────────────────
function HarvestPage() {
  const RES_CIRCLES = [
    {emoji:'🟡',color:'#f59e0b',val:'0.00'},
    {emoji:'🟢',color:'#22c55e',val:'0.00'},
    {emoji:'🔵',color:'#06b6d4',val:'0.00'},
    {emoji:'🔴',color:'#ef4444',val:'0.00'},
    {emoji:'🟣',color:'#a78bfa',val:'0.00'},
  ]
  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      {/* Tab切换 */}
      <div style={{display:'flex',gap:4,padding:'10px 16px',borderBottom:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
        <button className="tab-item active">地块</button>
        <button className="tab-item">钻头</button>
      </div>
      {/* 主体 */}
      <div style={{flex:1,position:'relative'}}>
        <EvoEmpty text="空空如也" />
      </div>
      {/* 底部资源+领取按钮 - 仿截图9 */}
      <div style={{
        display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'10px 20px',
        borderTop:'1px solid rgba(255,255,255,0.06)',
        background:'rgba(8,14,28,0.95)',
        flexShrink:0,
      }}>
        <div style={{display:'flex',gap:14}}>
          {RES_CIRCLES.map((r,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:5}}>
              <div style={{
                width:24,height:24,borderRadius:'50%',
                background:`${r.color}20`,border:`2px solid ${r.color}`,
                display:'flex',alignItems:'center',justifyContent:'center',fontSize:11
              }}>{r.emoji}</div>
              <span style={{fontFamily:'Rajdhani,monospace',fontWeight:700,color:r.color,fontSize:14}}>{r.val}</span>
            </div>
          ))}
        </div>
        <button className="btn btn-sm btn-primary">领取</button>
      </div>
    </div>
  )
}

// ── 公共组件 ───────────────────────────────────────────────────
function FilterGroup({title, children}) {
  return (
    <div style={{marginBottom:14}}>
      <div style={{fontSize:11,color:'#475569',marginBottom:6,fontWeight:600}}>{title}</div>
      <div style={{display:'flex',flexDirection:'column',gap:4}}>{children}</div>
    </div>
  )
}
function FilterItem({children}) {
  const [on, setOn] = useState(false)
  return (
    <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:12,color:on?'#4ade80':'#64748b'}}>
      <input type="radio" style={{accentColor:'#4ade80'}} onChange={()=>setOn(v=>!v)}/>
      {children}
    </label>
  )
}

// ── 主页 ───────────────────────────────────────────────────────
const SUB_TABS = [
  {id:'token',    label:'💰 Token'},
  {id:'lands',    label:'🏔 地块'},
  {id:'apostles', label:'🧙 使徒'},
  {id:'drills',   label:'⛏ 钻头'},
  {id:'harvest',  label:'🌾 领取'},
]

export default function AssetsPage() {
  const { isConnected } = useAccount()
  const [sub, setSub] = useState('token')

  const views = {
    token:    <TokenPage />,
    lands:    <LandsPage />,
    apostles: <ApostlePage />,
    drills:   <DrillPage />,
    harvest:  <HarvestPage />,
  }

  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',overflow:'hidden',background:'linear-gradient(180deg,#0d1a2e 0%,#0a1020 100%)'}}>
      {/* 二级导航 - 仿截图5 */}
      <div style={{
        display:'flex',alignItems:'center',
        padding:'0 16px',height:42,
        borderBottom:'1px solid rgba(255,255,255,0.06)',
        background:'rgba(8,14,28,0.95)',
        flexShrink:0,gap:2,
      }}>
        {SUB_TABS.map(t=>(
          <button
            key={t.id}
            className={`tab-item${sub===t.id?' active':''}`}
            onClick={()=>setSub(t.id)}
          >{t.label}</button>
        ))}
      </div>

      {!isConnected ? (
        <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14}}>
          <div style={{fontSize:48,opacity:0.2}}>💎</div>
          <div style={{fontSize:15,color:'#475569'}}>请先连接钱包</div>
          <ConnectButton />
        </div>
      ) : (
        <div style={{flex:1,overflow:'hidden'}}>
          {views[sub]}
        </div>
      )}
    </div>
  )
}
