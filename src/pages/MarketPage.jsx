import React, { useState, useEffect } from 'react'
import { usePublicClient } from 'wagmi'
import { formatEther, getContract } from 'viem'
import { CONTRACTS, LAND_COLORS, RES_NAMES_EN, RES_NAMES_ZH, RES_COLORS, isDeployed } from '../constants/contracts.js'
import { LAND_ABI, AUCTION_ABI } from '../constants/abi.js'
import './MarketPage.css'

const ZERO = '0x0000000000000000000000000000000000000000'

function decodeRates(attr80) {
  const n = BigInt(attr80)
  return Array.from({ length: 5 }, (_, i) => Number((n >> BigInt(i * 16)) & 0xFFFFn))
}

// 等轴3D地块方块（SVG）
function LandCube({ color }) {
  const top   = color
  const right = shadeColor(color, -30)
  const left  = shadeColor(color, -15)
  return (
    <svg viewBox="0 0 80 80" width="92" height="92" style={{ display: 'block', margin: '0 auto' }}>
      {/* 顶面 */}
      <polygon points="40,8 72,24 40,40 8,24" fill={top} />
      {/* 左面 */}
      <polygon points="8,24 40,40 40,72 8,56" fill={left} />
      {/* 右面 */}
      <polygon points="72,24 40,40 40,72 72,56" fill={right} />
      {/* 高光 */}
      <polygon points="40,8 72,24 40,40 8,24" fill="rgba(255,255,255,0.12)" style={{ mixBlendMode: 'screen' }} />
    </svg>
  )
}

function shadeColor(hex, pct) {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, Math.min(255, (num >> 16) + pct))
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + pct))
  const b = Math.max(0, Math.min(255, (num & 0xff) + pct))
  return `rgb(${r},${g},${b})`
}

const LAND_TYPES_ZH = ['黄金大陆', '木材森林', '水源绿洲', '火焰熔岩', '土地荒原']
const RES_KEYS_FILTER = ['GOLD', 'WOOD', 'WATER', 'FIRE', 'SOIL']

export default function MarketPage() {
  const pub = usePublicClient()
  const [list,    setList]    = useState([])
  const [loading, setLoading] = useState(false)
  const [tab,     setTab]     = useState('all')    // all | first | transfer
  const [sort,    setSort]    = useState('price')  // price | time
  const [sortDir, setSortDir] = useState('asc')
  const [filter, setFilter]   = useState({ type: '', element: '' })
  const dep = isDeployed('auction')

  // 模拟数据（合约未部署时展示）
  const MOCK = Array.from({ length: 14 }, (_, i) => {
    const mt = i % 5
    return {
      id: i + 1,
      x: -(42 + (i % 8)),
      y: -(i % 5),
      mainType: mt,
      rates: Array.from({ length: 5 }, (_, j) => j === mt ? 60 + (i * 7) % 140 : (i * j * 3) % 50),
      price: 10 - i * 0.5,
      seller: ZERO,
      startedAt: Date.now() / 1000 - 3600 * (i + 1),
    }
  })

  const load = async () => {
    if (!dep) { setList(MOCK); return }
    if (!pub) return
    setLoading(true)
    try {
      const aC = getContract({ address: CONTRACTS.auction, abi: AUCTION_ABI, client: pub })
      const lC = getContract({ address: CONTRACTS.land,    abi: LAND_ABI,    client: pub })
      const f   = await pub.createContractEventFilter({ address: CONTRACTS.auction, abi: AUCTION_ABI, eventName: 'AuctionCreated', fromBlock: 0n })
      const evs = await pub.getFilterLogs({ filter: f })
      const items = (await Promise.all(evs.map(async ev => {
        const id = Number(ev.args.id)
        try {
          const a     = await aC.read.auctions([BigInt(id)])
          if (!a.startedAt || a.startedAt === 0n) return null
          const price = await aC.read.currentPrice([BigInt(id)])
          const [x, y] = await lC.read.decodeId([BigInt(id)])
          const attr   = await lC.read.resourceAttr([BigInt(id)])
          const rates  = decodeRates(attr)
          const mt = rates.indexOf(Math.max(...rates))
          return { id, x: Number(x), y: Number(y), mainType: mt, rates, seller: a.seller, price: parseFloat(formatEther(price)), startedAt: Number(a.startedAt) }
        } catch { return null }
      }))).filter(Boolean)
      setList(items)
    } catch {}
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [dep])

  // 筛选+排序
  const filtered = list
    .filter(a => filter.element === '' || a.mainType === parseInt(filter.element))
    .sort((a, b) => {
      const v = sort === 'price' ? a.price - b.price : a.startedAt - b.startedAt
      return sortDir === 'asc' ? v : -v
    })

  return (
    <div className="mp-root">
      {/* 左侧筛选栏 */}
      <aside className="mp-side">
        <div className="mp-side-hd">
          <span>篩選</span>
          <button className="mp-reset" onClick={() => setFilter({ type: '', element: '' })}>重置篩選項</button>
        </div>

        <div className="mp-filter-group">
          <div className="mp-filter-title">土地類型</div>
          {['普通地', '保留地', '神秘地'].map(t => (
            <label key={t} className="mp-radio">
              <input type="radio" name="ltype" />
              <span>{t}</span>
            </label>
          ))}
        </div>

        <div className="mp-filter-group">
          <div className="mp-filter-title">元素類型</div>
          <div className="mp-el-grid">
            {RES_KEYS_FILTER.map((k, i) => (
              <button
                key={k}
                className={`mp-el-btn ${filter.element === String(i) ? 'active' : ''}`}
                onClick={() => setFilter(f => ({ ...f, element: f.element === String(i) ? '' : String(i) }))}
                style={filter.element === String(i) ? { borderColor: RES_COLORS[i], color: RES_COLORS[i] } : {}}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        <div className="mp-filter-group">
          <div className="mp-filter-title">價格</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input className="mp-price-input" type="number" placeholder="最小" />
            <span style={{ color: '#334155', fontSize: 12 }}>—</span>
            <input className="mp-price-input" type="number" placeholder="最大" />
          </div>
        </div>
      </aside>

      {/* 主内容 */}
      <div className="mp-main">
        {/* 顶部标签+排序 */}
        <div className="mp-top">
          <div className="mp-tabs">
            {[['all','全部'],['first','首售'],['transfer','轉售']].map(([id,l]) => (
              <button key={id} className={`mp-tab ${tab===id?'active':''}`} onClick={() => setTab(id)}>{l}</button>
            ))}
          </div>
          <div className="mp-sort">
            <select className="mp-select" value={sort} onChange={e => setSort(e.target.value)}>
              <option value="price">價格</option>
              <option value="time">時間</option>
            </select>
            <select className="mp-select" value={sortDir} onChange={e => setSortDir(e.target.value)}>
              <option value="asc">升序</option>
              <option value="desc">降序</option>
            </select>
          </div>
        </div>

        {/* 卡片网格 */}
        <div className="mp-grid">
          {(loading ? Array(14).fill(null) : filtered).map((item, i) => (
            loading ? (
              <div key={i} className="mp-card skeleton" style={{ height: 260 }} />
            ) : (
              <div key={item.id} className="mp-card">
                {/* 编号标签 */}
                <div className="mp-card-badge">No.{i + 1}</div>
                {/* 坐标 */}
                <div className="mp-card-coord">{item.x},{item.y}</div>

                {/* 3D方块 */}
                <div className="mp-card-cube">
                  <LandCube color={LAND_COLORS[item.mainType]} />
                  <div className="mp-cube-glow" style={{ background: `radial-gradient(ellipse at 50% 80%, ${LAND_COLORS[item.mainType]}44 0%, transparent 70%)` }} />
                </div>

                {/* 资源 */}
                <div className="mp-card-res">
                  {item.rates.map((r, j) => r > 5 && (
                    <span key={j} className="mp-res-tag" style={{ color: RES_COLORS[j], borderColor: RES_COLORS[j] + '44' }}>
                      {RES_NAMES_EN[j][0]} {r}
                    </span>
                  ))}
                </div>

                {/* 价格 */}
                <div className="mp-card-price">
                  <span className="mp-price-num">{item.price.toFixed(2)}</span>
                  <span className="mp-price-unit">RING</span>
                </div>
                <button className="btn btn-primary btn-sm mp-bid-btn">立即競拍</button>
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  )
}
