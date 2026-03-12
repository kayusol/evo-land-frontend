import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import LandPanel from '../components/LandPanel.jsx'
import { LAND_COLORS, RES_COLORS } from '../constants/contracts.js'
import './WorldMap.css'

const GRID = 100
const BASE_CELL = 9

// Voronoi 分区 - 生成类似进化星球的大色块大陆
function buildRegionMap() {
  const seeds = [
    {x:8,  y:8,  t:3}, {x:25, y:5,  t:0}, {x:55, y:8,  t:4},
    {x:80, y:12, t:2}, {x:95, y:5,  t:1}, {x:3,  y:30, t:1},
    {x:18, y:35, t:2}, {x:42, y:28, t:3}, {x:68, y:22, t:0},
    {x:88, y:38, t:4}, {x:5,  y:55, t:0}, {x:28, y:58, t:4},
    {x:50, y:50, t:2}, {x:72, y:52, t:3}, {x:92, y:62, t:1},
    {x:12, y:75, t:2}, {x:35, y:78, t:1}, {x:58, y:72, t:0},
    {x:78, y:80, t:3}, {x:20, y:92, t:4}, {x:48, y:90, t:1},
    {x:70, y:88, t:0}, {x:90, y:92, t:2},
  ]
  const map = new Uint8Array(GRID * GRID)
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const nx = x + Math.sin(y * 0.23) * 4
      const ny = y + Math.cos(x * 0.19) * 4
      let minD = Infinity, t = 0
      for (const s of seeds) {
        const d = (nx - s.x) ** 2 + (ny - s.y) ** 2
        if (d < minD) { minD = d; t = s.t }
      }
      map[y * GRID + x] = t
    }
  }
  return map
}

function seedRates(x, y, mainType) {
  return Array.from({ length: 5 }, (_, i) => {
    const v = Math.abs(Math.sin((x * (i * 1.7 + 2) + y * (i * 1.3 + 1.5)) * 0.41 + i) * 255)
    return i === mainType ? Math.floor(v % 160 + 60) : Math.floor(v % 55 + 2)
  })
}

// 模拟玩家（展示用）
const MOCK_PLAYERS = [
  { x: 8,  y: 8,  color: '#c0392b' },
  { x: 25, y: 32, color: '#2980b9' },
  { x: 55, y: 50, color: '#27ae60' },
  { x: 72, y: 20, color: '#8e44ad' },
  { x: 18, y: 68, color: '#d68910' },
  { x: 88, y: 75, color: '#148f77' },
]

export default function WorldMap() {
  const { isConnected } = useAccount()
  const cvs  = useRef(null)
  const mini = useRef(null)   // 小地图 Canvas
  const [zoom, setZoom]       = useState(1)
  const [pan, setPan]         = useState({ x: 0, y: 0 })
  const [drag, setDrag]       = useState(null)
  const [moved, setMoved]     = useState(false)
  const [selected, setSelected] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [hovered, setHovered]   = useState(null)
  // 搜索坐标
  const [searchX, setSearchX] = useState('')
  const [searchY, setSearchY] = useState('')

  const regionMap = useMemo(() => buildRegionMap(), [])
  const getLand   = useCallback((x, y) => {
    const t = regionMap[y * GRID + x]
    return { mainType: t, rates: seedRates(x, y, t) }
  }, [regionMap])

  // ===== 主 Canvas 绘制 =====
  const draw = useCallback(() => {
    const c = cvs.current; if (!c) return
    const ctx = c.getContext('2d')
    const W = c.width, H = c.height
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#060d1a'; ctx.fillRect(0, 0, W, H)

    const cell = BASE_CELL * zoom
    const ox = pan.x + W / 2 - GRID * cell / 2
    const oy = pan.y + H / 2 - GRID * cell / 2

    // 地块色块
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const cx = ox + x * cell, cy = oy + y * cell
        if (cx + cell < 0 || cy + cell < 0 || cx > W || cy > H) continue
        ctx.fillStyle = LAND_COLORS[regionMap[y * GRID + x]]
        ctx.fillRect(cx, cy, cell - 0.4, cell - 0.4)
      }
    }

    // 网格线
    if (zoom > 2.8) {
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.4
      for (let x = 0; x <= GRID; x++) {
        const px = ox + x * cell
        ctx.beginPath(); ctx.moveTo(px, oy); ctx.lineTo(px, oy + GRID * cell); ctx.stroke()
      }
      for (let y = 0; y <= GRID; y++) {
        const py = oy + y * cell
        ctx.beginPath(); ctx.moveTo(ox, py); ctx.lineTo(ox + GRID * cell, py); ctx.stroke()
      }
    }

    // 坐标标注（确定性噪声，高缩放才显）
    if (zoom > 5) {
      ctx.font = `${Math.min(cell * 0.22, 9)}px monospace`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillStyle = 'rgba(255,255,255,0.45)'
      for (let y = 0; y < GRID; y++) {
        for (let x = 0; x < GRID; x++) {
          const cx = ox + x * cell, cy = oy + y * cell
          if (cx < -cell || cy < -cell || cx > W || cy > H) continue
          ctx.fillText(`${x},${y}`, cx + cell / 2, cy + cell / 2)
        }
      }
    }

    // 玩家头像
    const asz = Math.max(10, Math.min(26, cell * 1.7))
    if (zoom > 0.45) {
      for (const p of MOCK_PLAYERS) {
        const px = ox + p.x * cell + cell / 2
        const py = oy + p.y * cell + cell / 2
        if (px < -asz || py < -asz || px > W + asz || py > H + asz) continue
        const w = asz * 0.85, h = asz
        ctx.fillStyle = 'rgba(0,0,0,0.6)'
        ctx.fillRect(px - w/2 - 1, py - h/2 - 1, w + 2, h + 2)
        ctx.fillStyle = p.color
        ctx.fillRect(px - w/2, py - h/2, w, h)
        // 简单像素眼睛
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        const ew = Math.max(1, w * 0.18)
        ctx.fillRect(px - w * 0.2, py - h * 0.08, ew, ew)
        ctx.fillRect(px + w * 0.1, py - h * 0.08, ew, ew)
      }
    }

    // 悬停高亮
    if (hovered && zoom > 1.2) {
      const cx = ox + hovered.x * cell, cy = oy + hovered.y * cell
      ctx.fillStyle = 'rgba(255,255,255,0.14)'
      ctx.fillRect(cx, cy, cell - 0.4, cell - 0.4)
    }

    // 选中框
    if (selected) {
      const cx = ox + selected.x * cell, cy = oy + selected.y * cell
      const lw = Math.max(1.5, cell * 0.12)
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = lw
      ctx.strokeRect(cx + lw/2, cy + lw/2, cell - lw - 0.4, cell - lw - 0.4)
      ctx.fillStyle = '#ffffff'
      const cpts = [[cx,cy],[cx+cell-lw,cy],[cx,cy+cell-lw],[cx+cell-lw,cy+cell-lw]]
      cpts.forEach(([bx,by]) => ctx.fillRect(bx-1,by-1,3,3))
    }

    // 内边框
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1.5
    ctx.strokeRect(ox, oy, GRID * cell, GRID * cell)

    // 坐标轴
    if (zoom > 0.9) {
      const step = zoom > 4 ? 5 : zoom > 2 ? 10 : zoom > 1.2 ? 20 : 50
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.font = '9px monospace'
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
      for (let x = 0; x <= GRID; x += step) {
        const px = ox + x * cell
        if (px > 14 && px < W - 14) ctx.fillText(x, px, oy - 2)
      }
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
      for (let y = 0; y <= GRID; y += step) {
        const py = oy + y * cell
        if (py > 14 && py < H - 14) ctx.fillText(y, ox - 4, py)
      }
    }
  }, [zoom, pan, selected, hovered, regionMap])

  // ===== 小地图绘制 =====
  const drawMini = useCallback(() => {
    const m = mini.current; if (!m) return
    const ctx = m.getContext('2d')
    const W = m.width, H = m.height
    const cs = W / GRID  // 每格小地图像素大小

    // 地块小地图
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        ctx.fillStyle = LAND_COLORS[regionMap[y * GRID + x]]
        ctx.fillRect(x * cs, y * cs, cs, cs)
      }
    }

    // 当前视口框
    const c = cvs.current; if (!c) return
    const cell = BASE_CELL * zoom
    const ox = pan.x + c.width / 2 - GRID * cell / 2
    const oy = pan.y + c.height / 2 - GRID * cell / 2
    const vx = Math.max(0, -ox / cell)
    const vy = Math.max(0, -oy / cell)
    const vw = Math.min(GRID, c.width / cell)
    const vh = Math.min(GRID, c.height / cell)

    ctx.strokeStyle = 'rgba(255,255,255,0.85)'
    ctx.lineWidth = 1
    ctx.strokeRect(vx * cs, vy * cs, vw * cs, vh * cs)

    // 选中地块点
    if (selected) {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(selected.x * cs - 1, selected.y * cs - 1, cs + 2, cs + 2)
    }
  }, [zoom, pan, selected, regionMap])

  useEffect(() => { draw() }, [draw])
  useEffect(() => { drawMini() }, [drawMini])

  useEffect(() => {
    const resize = () => {
      const c = cvs.current; if (!c) return
      const p = c.parentElement
      c.width = p.offsetWidth; c.height = p.offsetHeight
      draw()
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [draw])

  const toCell = (cx, cy) => {
    const c = cvs.current; if (!c) return null
    const r = c.getBoundingClientRect()
    const cell = BASE_CELL * zoom
    const ox = pan.x + c.width / 2 - GRID * cell / 2
    const oy = pan.y + c.height / 2 - GRID * cell / 2
    const gx = Math.floor((cx - r.left - ox) / cell)
    const gy = Math.floor((cy - r.top  - oy) / cell)
    if (gx < 0 || gx >= GRID || gy < 0 || gy >= GRID) return null
    return { x: gx, y: gy }
  }

  const onDown  = e => { setDrag({ ox: e.clientX - pan.x, oy: e.clientY - pan.y }); setMoved(false) }
  const onMove  = e => {
    if (drag) {
      if (Math.abs(e.clientX - drag.ox - pan.x) > 3 || Math.abs(e.clientY - drag.oy - pan.y) > 3)
        setMoved(true)
      setPan({ x: e.clientX - drag.ox, y: e.clientY - drag.oy })
    }
    if (zoom > 1.2) setHovered(toCell(e.clientX, e.clientY))
    else setHovered(null)
  }
  const onUp = e => {
    if (drag && !moved) {
      const cell = toCell(e.clientX, e.clientY)
      if (cell) {
        setSelected({ ...cell, tokenId: cell.x * GRID + cell.y + 1, attr: getLand(cell.x, cell.y) })
        setPanelOpen(true)
      }
    }
    setDrag(null)
  }
  const onWheel = e => {
    e.preventDefault()
    const c = cvs.current; if (!c) return
    const r = c.getBoundingClientRect()
    const mx = e.clientX - r.left, my = e.clientY - r.top
    const f = e.deltaY < 0 ? 1.18 : 0.847
    const nz = Math.max(0.22, Math.min(18, zoom * f))
    const sc = nz / zoom
    setPan(p => ({ x: mx - (mx - p.x) * sc, y: my - (my - p.y) * sc }))
    setZoom(nz)
  }

  // 搜索跳转到指定坐标
  const jumpTo = () => {
    const gx = parseInt(searchX), gy = parseInt(searchY)
    if (isNaN(gx) || isNaN(gy) || gx < 0 || gx >= GRID || gy < 0 || gy >= GRID) return
    const c = cvs.current; if (!c) return
    const targetZoom = Math.max(zoom, 4)
    const cell = BASE_CELL * targetZoom
    setZoom(targetZoom)
    setPan({
      x: c.width  / 2 - gx * cell - cell / 2,
      y: c.height / 2 - gy * cell - cell / 2,
    })
    const attr = getLand(gx, gy)
    setSelected({ x: gx, y: gy, tokenId: gx * GRID + gy + 1, attr })
    setPanelOpen(true)
  }

  // 点击小地图快速跳转
  const onMiniClick = e => {
    const m = mini.current; if (!m) return
    const r = m.getBoundingClientRect()
    const gx = Math.floor((e.clientX - r.left) / (m.width / GRID))
    const gy = Math.floor((e.clientY - r.top)  / (m.height / GRID))
    if (gx < 0 || gx >= GRID || gy < 0 || gy >= GRID) return
    const c = cvs.current; if (!c) return
    const cell = BASE_CELL * zoom
    setPan({ x: c.width / 2 - gx * cell - cell / 2, y: c.height / 2 - gy * cell - cell / 2 })
  }

  const LEGEND = [
    { color: LAND_COLORS[0], zh: '黄金', en: 'Gold'  },
    { color: LAND_COLORS[1], zh: '木材', en: 'Wood'  },
    { color: LAND_COLORS[2], zh: '水源', en: 'Water' },
    { color: LAND_COLORS[3], zh: '火焰', en: 'Fire'  },
    { color: LAND_COLORS[4], zh: '土地', en: 'Soil'  },
  ]

  return (
    <div className="wm-root">
      {/* 工具栏 */}
      <div className="wm-toolbar">
        <div className="wm-tb-left">
          <span className="wm-title">🌍 地图 <em>World Map</em></span>
          <div className="wm-legend">
            {LEGEND.map((l, i) => (
              <span key={i} className="wm-leg-item">
                <b className="wm-leg-dot" style={{ background: l.color }} />
                {l.zh} <span>{l.en}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="wm-tb-right">
          {/* 坐标搜索 */}
          <div className="wm-search">
            <input
              className="wm-search-input"
              type="number" placeholder="X"
              value={searchX} onChange={e => setSearchX(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && jumpTo()}
              min="0" max="99"
            />
            <span style={{ color: '#334155', fontSize: 12 }}>,</span>
            <input
              className="wm-search-input"
              type="number" placeholder="Y"
              value={searchY} onChange={e => setSearchY(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && jumpTo()}
              min="0" max="99"
            />
            <button className="btn btn-sm wm-jump-btn" onClick={jumpTo}>跳转 Go</button>
          </div>
          <span className="wm-zoom-txt">{(zoom * 100).toFixed(0)}%</span>
          <button className="btn btn-sm btn-ghost"
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}
          >重置</button>
        </div>
      </div>

      {/* 地图主体 */}
      <div className="wm-body">
        <div className="wm-canvas-wrap">
          <canvas
            ref={cvs}
            className="wm-canvas"
            style={{ cursor: drag ? 'grabbing' : 'crosshair' }}
            onMouseDown={onDown}
            onMouseMove={onMove}
            onMouseUp={onUp}
            onMouseLeave={() => { setDrag(null); setHovered(null) }}
            onWheel={onWheel}
          />

          {/* 预览标签 */}
          <div className="wm-preview-badge">
            <span className="wm-badge-dot" />
            预览模式 Preview · 部署合约后显示真实数据
          </div>

          {/* 坐标提示 */}
          {hovered && (
            <div className="wm-coord-tip">
              ({hovered.x}, {hovered.y}) · ID #{hovered.x * 100 + hovered.y + 1}
            </div>
          )}

          {/* 小地图 */}
          <div className="wm-minimap">
            <div className="wm-mini-title">小地图 Minimap</div>
            <canvas
              ref={mini}
              className="wm-mini-canvas"
              width={130}
              height={130}
              onClick={onMiniClick}
              title="点击小地图快速跳转"
            />
          </div>

          {/* 缩放控件 */}
          <div className="wm-zoom-ctrl">
            <button className="wm-zoom-btn" onClick={() => setZoom(z => Math.min(18, z * 1.3))}>＋</button>
            <div className="wm-zoom-sep" />
            <button className="wm-zoom-btn" onClick={() => setZoom(z => Math.max(0.22, z * 0.77))}>－</button>
          </div>
        </div>

        {/* 右侧地块详情面板 */}
        {panelOpen && selected && (
          <LandPanel
            land={selected}
            onClose={() => { setPanelOpen(false); setSelected(null) }}
          />
        )}
      </div>

      {/* 未连接提示条 */}
      {!isConnected && (
        <div className="wm-connect-bar">
          <span>连接钱包以查看您的地块并进行交易 · Connect wallet to view your lands</span>
          <ConnectButton chainStatus="none" showBalance={false} />
        </div>
      )}
    </div>
  )
}
