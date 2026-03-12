import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import LandPanel from '../components/LandPanel.jsx'
import { LAND_COLORS, RES_COLORS, RES_NAMES_ZH } from '../constants/contracts.js'
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
      // 加扰动让边界自然
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
    return i === mainType
      ? Math.floor(v % 160 + 60)   // 主资源 60-220
      : Math.floor(v % 55 + 2)     // 次资源 2-57
  })
}

// 模拟玩家头像（像截图里的像素人物）
const MOCK_PLAYERS = [
  { x: 8,  y: 8,  color: '#e74c3c', emoji: '👤' },
  { x: 25, y: 32, color: '#3498db', emoji: '👤' },
  { x: 55, y: 50, color: '#2ecc71', emoji: '⚗️' },
  { x: 72, y: 20, color: '#9b59b6', emoji: '👤' },
  { x: 18, y: 68, color: '#f39c12', emoji: '👤' },
  { x: 88, y: 75, color: '#1abc9c', emoji: '👤' },
]

export default function WorldMap() {
  const { isConnected } = useAccount()
  const cvs = useRef(null)
  const [zoom, setZoom]     = useState(1)
  const [pan, setPan]       = useState({ x: 0, y: 0 })
  const [drag, setDrag]     = useState(null)
  const [moved, setMoved]   = useState(false)
  const [selected, setSelected] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [hovered, setHovered]    = useState(null)

  const regionMap = useMemo(() => buildRegionMap(), [])
  const getLand = useCallback((x, y) => {
    const mainType = regionMap[y * GRID + x]
    return { mainType, rates: seedRates(x, y, mainType) }
  }, [regionMap])

  const draw = useCallback(() => {
    const c = cvs.current; if (!c) return
    const ctx = c.getContext('2d')
    const W = c.width, H = c.height
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#060d1a'; ctx.fillRect(0, 0, W, H)

    const cell = BASE_CELL * zoom
    const ox = pan.x + W / 2 - GRID * cell / 2
    const oy = pan.y + H / 2 - GRID * cell / 2

    // ===== 地块 =====
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const cx = ox + x * cell, cy = oy + y * cell
        if (cx + cell < 0 || cy + cell < 0 || cx > W || cy > H) continue
        const t = regionMap[y * GRID + x]
        ctx.fillStyle = LAND_COLORS[t]
        ctx.fillRect(cx, cy, cell - 0.4, cell - 0.4)
      }
    }

    // ===== 网格线 =====
    if (zoom > 2.8) {
      ctx.strokeStyle = 'rgba(0,0,0,0.22)'
      ctx.lineWidth = 0.4
      for (let x = 0; x <= GRID; x++) {
        const px = ox + x * cell
        ctx.beginPath(); ctx.moveTo(px, oy); ctx.lineTo(px, oy + GRID * cell); ctx.stroke()
      }
      for (let y = 0; y <= GRID; y++) {
        const py = oy + y * cell
        ctx.beginPath(); ctx.moveTo(ox, py); ctx.lineTo(ox + GRID * cell, py); ctx.stroke()
      }
    }

    // ===== 玩家头像 =====
    const asz = Math.max(12, Math.min(28, cell * 1.8))
    if (zoom > 0.5) {
      for (const p of MOCK_PLAYERS) {
        const px = ox + p.x * cell + cell / 2
        const py = oy + p.y * cell + cell / 2
        if (px < -asz || py < -asz || px > W + asz || py > H + asz) continue
        const h = asz, w = asz * 0.82
        // 像素方块头像
        ctx.fillStyle = 'rgba(0,0,0,0.55)'
        ctx.fillRect(px - w / 2 - 1, py - h / 2 - 1, w + 2, h + 2)
        ctx.fillStyle = p.color
        ctx.fillRect(px - w / 2, py - h / 2, w, h)
        // 简单像素脸
        ctx.fillStyle = 'rgba(255,255,255,0.85)'
        const ew = Math.max(1, w * 0.2)
        ctx.fillRect(px - w * 0.22, py - h * 0.1, ew, ew)  // 左眼
        ctx.fillRect(px + w * 0.12, py - h * 0.1, ew, ew)  // 右眼
      }
    }

    // ===== 悬停高亮 =====
    if (hovered && zoom > 1.2) {
      const cx = ox + hovered.x * cell, cy = oy + hovered.y * cell
      ctx.fillStyle = 'rgba(255,255,255,0.13)'
      ctx.fillRect(cx, cy, cell - 0.4, cell - 0.4)
    }

    // ===== 选中框 =====
    if (selected) {
      const cx = ox + selected.x * cell, cy = oy + selected.y * cell
      const lw = Math.max(1.5, cell * 0.12)
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = lw
      ctx.strokeRect(cx + lw / 2, cy + lw / 2, cell - lw - 0.4, cell - lw - 0.4)
      // 四角标记
      const cs = Math.max(2.5, cell * 0.2)
      ctx.fillStyle = '#ffffff'
      ;[[cx, cy], [cx + cell - lw, cy], [cx, cy + cell - lw], [cx + cell - lw, cy + cell - lw]]
        .forEach(([bx, by]) => ctx.fillRect(bx - 1, by - 1, 3, 3))
    }

    // ===== 边框 =====
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    ctx.lineWidth = 1.5
    ctx.strokeRect(ox, oy, GRID * cell, GRID * cell)

    // ===== 坐标轴 =====
    if (zoom > 0.9) {
      const step = zoom > 4 ? 5 : zoom > 2 ? 10 : zoom > 1.2 ? 20 : 50
      ctx.fillStyle = 'rgba(255,255,255,0.22)'
      ctx.font = '9px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      for (let x = 0; x <= GRID; x += step) {
        const px = ox + x * cell
        if (px > 14 && px < W - 14) ctx.fillText(x, px, oy - 2)
      }
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      for (let y = 0; y <= GRID; y += step) {
        const py = oy + y * cell
        if (py > 14 && py < H - 14) ctx.fillText(y, ox - 4, py)
      }
    }
  }, [zoom, pan, selected, hovered, regionMap])

  useEffect(() => { draw() }, [draw])

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
      if (Math.abs(e.clientX - drag.ox - pan.x) > 3 || Math.abs(e.clientY - drag.oy - pan.y) > 3) setMoved(true)
      setPan({ x: e.clientX - drag.ox, y: e.clientY - drag.oy })
    }
    if (zoom > 1.2) setHovered(toCell(e.clientX, e.clientY))
    else setHovered(null)
  }
  const onUp = e => {
    if (drag && !moved) {
      const cell = toCell(e.clientX, e.clientY)
      if (cell) {
        const tid = cell.x * GRID + cell.y + 1
        setSelected({ ...cell, tokenId: tid, attr: getLand(cell.x, cell.y) })
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
    const nz = Math.max(0.25, Math.min(18, zoom * f))
    const sc = nz / zoom
    setPan(p => ({ x: mx - (mx - p.x) * sc, y: my - (my - p.y) * sc }))
    setZoom(nz)
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
          <span className="wm-zoom-txt">{(zoom * 100).toFixed(0)}%</span>
          <button className="btn btn-sm btn-ghost"
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}
          >重置 Reset</button>
        </div>
      </div>

      {/* 地图主体 */}
      <div className="wm-body">
        {/* Canvas */}
        <div className="wm-canvas-wrap">
          <canvas
            ref={cvs}
            className="wm-canvas"
            style={{ cursor: drag ? 'grabbing' : 'default' }}
            onMouseDown={onDown}
            onMouseMove={onMove}
            onMouseUp={onUp}
            onMouseLeave={() => { setDrag(null); setHovered(null) }}
            onWheel={onWheel}
          />

          {/* 预览提示 */}
          <div className="wm-preview-badge">
            <span className="wm-badge-dot" />
            预览模式 Preview · 部署合约后显示真实数据
          </div>

          {/* 缩放控件 */}
          <div className="wm-zoom-ctrl">
            <button className="wm-zoom-btn" onClick={() => setZoom(z => Math.min(18, z * 1.3))}>＋</button>
            <div className="wm-zoom-sep" />
            <button className="wm-zoom-btn" onClick={() => setZoom(z => Math.max(0.25, z * 0.77))}>－</button>
          </div>

          {/* 坐标提示 */}
          {hovered && (
            <div className="wm-coord-tip">
              ({hovered.x}, {hovered.y}) · ID #{hovered.x * 100 + hovered.y + 1}
            </div>
          )}
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
