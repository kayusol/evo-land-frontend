import React, { useState, useEffect } from 'react'
import { useAccount, usePublicClient, useReadContract } from 'wagmi'
import { formatEther, getContract } from 'viem'
import { CONTRACTS, RES_KEYS, RES_NAMES_ZH, RES_NAMES_EN, RES_EMOJIS, RES_COLORS, LAND_COLORS, isDeployed } from '../constants/contracts.js'
import { APOSTLE_ABI, DRILL_ABI, ERC20_ABI, LAND_ABI, MINING_ABI } from '../constants/abi.js'
import ResourceBar from '../components/ResourceBar.jsx'
import './AssetsPage.css'

const ZERO = '0x0000000000000000000000000000000000000000'

// === Token 页 ===
function TokenPage() {
  const { address } = useAccount()
  const RES_LABELS = ['GOLD','WOOD','WATER','FIRE','SOIL']
  const LP_LABELS  = ['GOLD-RING','WOOD-RING','WATER-RING','FIRE-RING','SOIL-RING']

  function Bal({ addr, label, emoji, color }) {
    const { data } = useReadContract({
      address: addr, abi: ERC20_ABI, functionName: 'balanceOf',
      args: [address],
      query: { enabled: !!address && addr !== ZERO },
    })
    const v = data ? parseFloat(formatEther(data)) : 0
    return (
      <div className="at-token-card">
        <div className="at-tok-icon" style={{ fontSize: 28 }}>{emoji}</div>
        <div className="at-tok-label" style={{ color }}>{label}</div>
        <div className="at-tok-val">{v.toFixed(2)}</div>
        <button className="btn btn-xs at-tok-btn">轉賬</button>
      </div>
    )
  }

  return (
    <div className="at-token-wrap">
      {/* RING */}
      <div className="at-ring-row">
        <div className="at-ring-icon">💎</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>RING 💎🦊🌐</div>
          <div style={{ fontSize: 21, fontWeight: 800, color: '#a78bfa', fontFamily: 'Rajdhani, monospace', marginTop: 2 }}>0.00</div>
        </div>
        <button className="btn btn-sm">轉賬</button>
      </div>

      {/* 5资源 */}
      <div className="at-token-grid">
        {RES_KEYS.map((k, i) => (
          <Bal key={k} addr={CONTRACTS[k]} label={RES_LABELS[i]} emoji={RES_EMOJIS[i]} color={RES_COLORS[i]} />
        ))}
      </div>

      {/* LP tokens */}
      <div className="at-section-title">LP 代幣</div>
      <div className="at-token-grid">
        {RES_KEYS.map((k, i) => (
          <div key={k} className="at-token-card">
            <div className="at-tok-icon" style={{ position: 'relative', fontSize: 22 }}>
              <span>{RES_EMOJIS[i]}</span>
              <span style={{ position: 'absolute', right: -4, bottom: -4, fontSize: 14 }}>💎</span>
            </div>
            <div className="at-tok-label" style={{ color: RES_COLORS[i] }}>{LP_LABELS[i]}</div>
            <div className="at-tok-val">0.00</div>
            <button className="btn btn-xs at-tok-btn">轉賬</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// === 地境页 ===
function LandsPage() {
  const { address } = useAccount()
  const pub = usePublicClient()
  const [tab, setTab] = useState('mine')
  const [lands, setLands] = useState([])
  const [loading, setLoading] = useState(false)
  const dep = isDeployed('land')

  function decodeRates(attr80) {
    const n = BigInt(attr80)
    return Array.from({ length: 5 }, (_, i) => Number((n >> BigInt(i * 16)) & 0xFFFFn))
  }

  const load = async () => {
    if (!address || !pub || !dep) return
    setLoading(true)
    try {
      const lc = getContract({ address: CONTRACTS.land, abi: LAND_ABI, client: pub })
      const f1 = await pub.createContractEventFilter({ address: CONTRACTS.land, abi: LAND_ABI, eventName: 'Transfer', args: { to: address }, fromBlock: 0n })
      const rcv = await pub.getFilterLogs({ filter: f1 })
      const ids = new Set(rcv.map(e => Number(e.args.tokenId)))
      const f2 = await pub.createContractEventFilter({ address: CONTRACTS.land, abi: LAND_ABI, eventName: 'Transfer', args: { from: address }, fromBlock: 0n })
      const snt = await pub.getFilterLogs({ filter: f2 })
      snt.forEach(e => ids.delete(Number(e.args.tokenId)))
      const items = await Promise.all([...ids].map(async id => {
        const [x, y] = await lc.read.decodeId([BigInt(id)])
        const attr   = await lc.read.resourceAttr([BigInt(id)])
        return { tokenId: id, x: Number(x), y: Number(y), rates: decodeRates(attr) }
      }))
      setLands(items)
    } catch {}
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [address])

  return (
    <div className="at-land-wrap">
      {/* 筛选栏 */}
      <aside className="at-land-side">
        <div className="mp-side-hd"><span>篩選</span><button className="mp-reset">重置篩選項</button></div>
        <div className="mp-filter-group">
          <div className="mp-filter-title">土地類型</div>
          {['普通地','保留地','神秘地'].map(t => <label key={t} className="mp-radio"><input type="radio" name="lt2" /><span>{t}</span></label>)}
        </div>
        <div className="mp-filter-group">
          <div className="mp-filter-title">元素類型</div>
          <div className="mp-el-grid">
            {['GOLD','WOOD','WATER','FIRE','SOIL'].map((k,i) => (
              <button key={k} className="mp-el-btn" style={{ color: RES_COLORS[i], borderColor: RES_COLORS[i]+'44' }}>{k}</button>
            ))}
          </div>
        </div>
      </aside>

      {/* 主区 */}
      <div className="at-land-main">
        <div className="mp-top">
          <div className="mp-tabs">
            {[['mine','我的地境'],['listing','出價'],['selling','售賣中'],['pending','未領取']].map(([id,l]) => (
              <button key={id} className={`mp-tab ${tab===id?'active':''}`} onClick={() => setTab(id)}>{l}</button>
            ))}
          </div>
          <div className="mp-sort">
            <select className="mp-select"><option>價格</option></select>
            <select className="mp-select"><option>升序</option></select>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {!dep ? (
            <div className="notice-bar" style={{ margin: 12 }}><span className="notice-icon">⚠</span>合約未部署</div>
          ) : loading ? (
            <div className="mp-grid" style={{ padding: 0 }}>{[...Array(6)].map((_,i) => <div key={i} className="skeleton" style={{ height: 200 }} />)}</div>
          ) : lands.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 72, opacity: 0.13 }}>😕</div>
              <h4>空空如也</h4>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 6 }}>購買地境</button>
            </div>
          ) : (
            <div className="mp-grid" style={{ padding: 0 }}>
              {lands.map((l,i) => {
                const mt = l.rates.indexOf(Math.max(...l.rates))
                return (
                  <div key={l.tokenId} className="mp-card">
                    <div className="mp-card-badge">No.{i+1}</div>
                    <div className="mp-card-coord">{l.x},{l.y}</div>
                    <div className="mp-card-cube" style={{ marginTop: 12 }}>
                      <svg viewBox="0 0 80 80" width="80" height="80" style={{ display:'block',margin:'0 auto' }}>
                        <polygon points="40,8 72,24 40,40 8,24" fill={LAND_COLORS[mt]} />
                        <polygon points="8,24 40,40 40,72 8,56" fill={LAND_COLORS[mt]+'bb'} />
                        <polygon points="72,24 40,40 40,72 72,56" fill={LAND_COLORS[mt]+'88'} />
                      </svg>
                    </div>
                    <div style={{ fontSize: 9, color: '#334155', fontFamily: 'monospace' }}>#{String(l.tokenId).padStart(5,'0')}</div>
                    <button className="btn btn-sm" style={{ width:'100%', fontSize: 11 }}>出售</button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// === 使徒页 ===
function ApostlePage() {
  const { address } = useAccount()
  const pub = usePublicClient()
  const [tab, setTab] = useState('mine')
  const [apostles, setApostles] = useState([])
  const [loading,  setLoading]  = useState(false)
  const dep = isDeployed('apostle')

  const load = async () => {
    if (!address || !pub || !dep) return
    setLoading(true)
    try {
      const ac = getContract({ address: CONTRACTS.apostle, abi: APOSTLE_ABI, client: pub })
      const f1 = await pub.createContractEventFilter({ address: CONTRACTS.apostle, abi: APOSTLE_ABI, eventName: 'Transfer', args: { to: address }, fromBlock: 0n })
      const rcv = await pub.getFilterLogs({ filter: f1 })
      const ids = new Set(rcv.map(e => Number(e.args.tokenId)))
      const f2 = await pub.createContractEventFilter({ address: CONTRACTS.apostle, abi: APOSTLE_ABI, eventName: 'Transfer', args: { from: address }, fromBlock: 0n })
      const snt = await pub.getFilterLogs({ filter: f2 })
      snt.forEach(e => ids.delete(Number(e.args.tokenId)))
      const as = await Promise.all([...ids].map(async id => {
        const a = await ac.read.attrs([BigInt(id)])
        return { tokenId: id, strength: Number(a.strength), element: Number(a.element) }
      }))
      setApostles(as)
    } catch {}
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [address])

  const TABS = [['mine','我的使徒'],['listing','出售中'],['hatching','待相親'],['recruiting','待招募'],['listed','已出價'],['pending','未領取']]

  return (
    <div className="at-full-wrap">
      <aside className="at-land-side">
        <div className="mp-side-hd"><span>篩選</span><button className="mp-reset">重置篩選項</button></div>
        <div className="mp-filter-group">
          <div className="mp-filter-title">元素偏好</div>
          <div className="mp-el-grid">
            {['GOLD','WOOD','WATER','FIRE','SOIL'].map((k,i) => (
              <button key={k} className="mp-el-btn" style={{ color: RES_COLORS[i] }}>{k}</button>
            ))}
          </div>
        </div>
        <div className="mp-filter-group">
          <div className="mp-filter-title">職業</div>
          {['劍士','衛士','普通'].map(t => <label key={t} className="mp-radio"><input type="radio" name="apo-class" /><span>{t}</span></label>)}
        </div>
        <div className="mp-filter-group">
          <div className="mp-filter-title">代齡</div>
          <input type="range" min="0" max="10" style={{ width: '100%', accentColor: 'var(--green)' }} />
        </div>
      </aside>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="mp-top">
          <div className="mp-tabs" style={{ flexWrap: 'wrap' }}>
            {TABS.map(([id,l]) => (
              <button key={id} className={`mp-tab ${tab===id?'active':''}`} onClick={() => setTab(id)}>{l}</button>
            ))}
          </div>
          <div className="mp-sort">
            <select className="mp-select"><option>時間</option></select>
            <select className="mp-select"><option>升序</option></select>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {!dep ? (
            <div className="notice-bar"><span className="notice-icon">⚠</span>合約未部署</div>
          ) : loading ? (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:12}}>{[...Array(4)].map((_,i)=><div key={i} className="skeleton" style={{height:180}}/>)}</div>
          ) : apostles.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 72, opacity: 0.13 }}>😕</div>
              <h4>空空如也</h4>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 6 }}>購買使徒</button>
            </div>
          ) : (
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:12 }}>
              {apostles.map(a => (
                <div key={a.tokenId} style={{ background:'#1a2540',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,padding:14,textAlign:'center' }}>
                  <div style={{ fontSize:38,marginBottom:8 }}>🧙</div>
                  <div style={{ fontFamily:'monospace',fontSize:11,color:'#334155',marginBottom:6 }}>#{String(a.tokenId).padStart(4,'0')}</div>
                  <div style={{ fontSize:13,color:'#fbbf24',fontWeight:700 }}>力量 {a.strength}/100</div>
                  <div style={{ fontSize:11,color:RES_COLORS[a.element],marginTop:4 }}>{RES_EMOJIS[a.element]} {RES_NAMES_ZH[a.element]}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// === 钻头页 ===
function DrillPage() {
  const { address } = useAccount()
  const pub = usePublicClient()
  const [tab, setTab] = useState('all')
  const [drills, setDrills] = useState([])
  const [loading, setLoading] = useState(false)
  const dep = isDeployed('drill')

  const load = async () => {
    if (!address || !pub || !dep) return
    setLoading(true)
    try {
      const dc = getContract({ address: CONTRACTS.drill, abi: DRILL_ABI, client: pub })
      const f1 = await pub.createContractEventFilter({ address: CONTRACTS.drill, abi: DRILL_ABI, eventName: 'Transfer', args: { to: address }, fromBlock: 0n })
      const rcv = await pub.getFilterLogs({ filter: f1 })
      const ids = new Set(rcv.map(e => Number(e.args.tokenId)))
      const f2 = await pub.createContractEventFilter({ address: CONTRACTS.drill, abi: DRILL_ABI, eventName: 'Transfer', args: { from: address }, fromBlock: 0n })
      const snt = await pub.getFilterLogs({ filter: f2 })
      snt.forEach(e => ids.delete(Number(e.args.tokenId)))
      const ds = await Promise.all([...ids].map(async id => {
        const a = await dc.read.attrs([BigInt(id)])
        return { tokenId: id, tier: Number(a.tier), affinity: Number(a.affinity) }
      }))
      setDrills(ds)
    } catch {}
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [address] )

  return (
    <div className="at-full-wrap">
      <aside className="at-land-side">
        <div className="mp-side-hd"><span>篩選</span><button className="mp-reset">重置篩選項</button></div>
      </aside>
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div className="mp-top">
          <div className="mp-tabs">
            {[['all','全部'],['idle','閒置'],['working','工作中']].map(([id,l]) => (
              <button key={id} className={`mp-tab ${tab===id?'active':''}`} onClick={() => setTab(id)}>{l}</button>
            ))}
          </div>
          <div className="mp-sort">
            <select className="mp-select"><option>稀有度</option></select>
            <select className="mp-select"><option>默認</option></select>
          </div>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:20 }}>
          {!dep ? (
            <div className="notice-bar"><span className="notice-icon">⚠</span>合約未部署</div>
          ) : loading ? (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:12}}>{[...Array(4)].map((_,i)=><div key={i} className="skeleton" style={{height:170}}/>)}</div>
          ) : drills.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 72, opacity: 0.13 }}>😕</div>
              <h4>空空如也</h4>
            </div>
          ) : (
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:12 }}>
              {drills.map(d => (
                <div key={d.tokenId} style={{ background:'#1a2540',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,padding:14,textAlign:'center' }}>
                  <div style={{ fontSize:38,marginBottom:8 }}>⛏</div>
                  <div style={{ fontFamily:'monospace',fontSize:11,color:'#334155',marginBottom:6 }}>#{String(d.tokenId).padStart(4,'0')}</div>
                  <div style={{ fontSize:16,color:'#fbbf24',letterSpacing:2 }}>{'★'.repeat(d.tier)}{'☆'.repeat(5-d.tier)}</div>
                  <div style={{ fontSize:11,color:RES_COLORS[d.affinity],marginTop:4 }}>{RES_EMOJIS[d.affinity]} +{d.tier*20}%</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// === 领取页 ===
function HarvestPage() {
  const { address } = useAccount()
  const [tab, setTab] = useState('land')
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '12px 20px 0', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[['land','地境'],['drill','鑽頭']].map(([id,l]) => (
            <button key={id} className={`tab-item ${tab===id?'active':''}`} onClick={() => setTab(id)}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        <div style={{
          background: '#111d35',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 10,
          minHeight: 300,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="empty-state">
            <div style={{ fontSize: 60, opacity: 0.13 }}>😕</div>
            <h4>空空如也</h4>
          </div>
        </div>
      </div>
      {/* 底部汇总 */}
      <div style={{
        padding: '10px 20px',
        borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
        background: 'rgba(8,14,28,0.8)',
      }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          {[0,1,2,3,4].map(i => (
            <span key={i} style={{ display:'flex', alignItems:'center', gap: 4 }}>
              <span style={{ fontSize: 16 }}>{['🪙','🌲','💧','🔥','⛰'][i]}</span>
              <span style={{ fontFamily:'Rajdhani,monospace', fontWeight:700, color: RES_COLORS[i], fontSize: 13 }}>0.00</span>
            </span>
          ))}
        </div>
        <button className="btn btn-primary btn-sm">領取</button>
      </div>
    </div>
  )
}

// === 主组件 ===
const SUB_TABS = [
  { id: 'token',   zh: 'Token',  icon: '💰' },
  { id: 'land',    zh: '地境',   icon: '🌍' },
  { id: 'apostle', zh: '使徒',   icon: '🧙' },
  { id: 'drill',   zh: '鑽頭',   icon: '⛏' },
  { id: 'harvest', zh: '領取',   icon: '🌾' },
]

export default function AssetsPage() {
  const { address } = useAccount()
  const [sub, setSub] = useState('token')

  const content = {
    token:   <TokenPage />,
    land:    <LandsPage />,
    apostle: <ApostlePage />,
    drill:   <DrillPage />,
    harvest: <HarvestPage />,
  }

  if (!address) return (
    <div className="nc-state">
      <div className="nc-icon">💎</div>
      <h3>請先連接錢包</h3>
      <p>Connect wallet to view assets</p>
    </div>
  )

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <ResourceBar />
      {/* 子标签导航 */}
      <div className="at-subnav">
        {SUB_TABS.map(t => (
          <button key={t.id} className={`at-subtab ${sub===t.id?'active':''}`} onClick={() => setSub(t.id)}>
            <span>{t.icon}</span>
            <span>{t.zh}</span>
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {content[sub]}
      </div>
    </div>
  )
}
