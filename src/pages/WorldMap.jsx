import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import LandPanel from '../components/LandPanel.jsx'
import { LAND_COLORS } from '../constants/contracts.js'
import './WorldMap.css'

const GRID = 100
const BASE_CELL = 9

// 模拟区域分布 —— 仿原版大色块（有"大陆"感）
function buildRegionMap() {
  // 用柏林噪声感的分层随机生成"大陆"色块
  const map = new Uint8Array(GRID * GRID)
  // 生成几个主控制点，做voronoi分区
  const seeds = [
    { x: 15, y: 15, t: 0 }, { x: 50, y: 10, t: 2 }, { x: 85, y: 20, t: 3 },
    { x: 10, y: 50, t: 4 }, { x: 35, y: 40, t: 1 }, { x: 65, y: 35, t: 2 },
    { x: 90, y: 55, t: 0 }, { x: 20, y: 75, t: 3 }, { x: 55, y: 70, t: 1 },
    { x: 80, y: 80, t: 4 }, { x: 45, y: 85, t: 2 }, { x: 15, y: 90, t: 0 },
  ]
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      // 找最近种子
      let minD = Infinity, t = 0
      for (const s of seeds) {
        const d = (x - s.x) ** 2 + (y - s.y) ** 2
        if (d < minD) { minD = d; t = s.t }
      }
      // 加一点噪声防止太硬
      const noise = Math.sin(x * 0.31 + y * 0.17) * 12 + Math.cos(x * 0.19 - y * 0.23) * 8
      const noiseType = ((t + Math.floor(noise / 10) + 5) % 5 + 5) % 5
      map[y * GRID + x] = minD < 120 ? t : noiseType
    }
  }
  return map
}

function seedRates(x, y, mainType) {
  return Array.from({ length: 5 }, (_, i) => {
    const v = Math.abs(Math.sin((x * (i + 3) * 0.17 + y * (i + 2) * 0.13) * 3.7) * 200)
    return i === mainType ? Math.floor(v % 150 + 50) : Math.floor(v % 60 + 2)
  })
}

// 模拟几个占领者头像（仿截图里的像素头像）
const AVATAR_COLORS = ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#1abc9c']
const MOCK_PLAYERS = [
  { x: 12, y: 15, color: AVATAR_COLORS[0], label: 'A' },
  { x: 33, y: 42, color: AVATAR_COLORS[1], label: 'B' },
  { x: 60, y: 28, color: AVATAR_COLORS[2], label: 'C' },
  { x: 75, y: 65, color: AVATAR_COLORS[3], label: 'D' },
  { x: 22, y: 72, color: AVATAR_COLORS[4], label: 'E' },
  { x: 88, y: 45, color: AVATAR_COLORS[5], label: 'F' },
]

export default function WorldMap() {
  const { isConnected } = useAccount()
  const cvs = useRef(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [drag, setDrag] = useState(null)
  const [hasMoved, setHasMoved] = useState(false)
  const [selected, setSelected] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [hovered, setHovered] = useState(null)

  const regionMap = useMemo(() => buildRegionMap(), [])

  const getLandData = useCallback((x, y) => {
    const mainType = regionMap[y * GRID + x]
    return { mainType, rates: seedRates(x, y, mainType) }
  }, [regionMap])

  const getCellPos = useCallback((canvas, px, py) => {
    const cell = BASE_CELL * zoom
    const ox = pan.x + canvas.width / 2 - (GRID * cell) / 2
    const oy = pan.y + canvas.height / 2 - (GRID * cell) / 2
    return { ox, oy, cell }
  }, [zoom, pan])

  const draw = useCallback(() => {
    const c = cvs.current; if (!c) return
    const ctx = c.getContext('2d')
    const W = c.width, H = c.height
    ctx.clearRect(0, 0, W, H)

    // 深色背景
    ctx.fillStyle = '#060d1a'
    ctx.fillRect(0, 0, W, H)

    const cell = BASE_CELL * zoom
    const ox = pan.x + W / 2 - (GRID * cell) / 2
    const oy = pan.y + H / 2 - (GRID * cell) / 2

    // 地块
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const cx = ox + x * cell, cy = oy + y * cell
        if (cx + cell < 0 || cy + cell < 0 || cx > W || cy > H) continue
        const t = regionMap[y * GRID + x]
        ctx.fillStyle = LAND_COLORS[t]
        ctx.fillRect(cx, cy, cell - 0.5, cell - 0.5)
      }
    }

    // 网格线（zoom > 2.5才显示）
    if (zoom > 2.5) {
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'
      ctx.lineWidth = 0.5
      for (let x = 0; x <= GRID; x++) {
        const px = ox + x * cell
        ctx.beginPath(); ctx.moveTo(px, oy); ctx.lineTo(px, oy + GRID * cell); ctx.stroke()
      }
      for (let y = 0; y <= GRID; y++) {
        const py = oy + y * cell
        ctx.beginPath(); ctx.moveTo(ox, py); ctx.lineTo(ox + GRID * cell, py); ctx.stroke()
      }
    }

    // 玩家头像（仿像素风格）
    if (zoom > 0.6) {
      const avatarSize = Math.max(14, cell * 1.6)
      for (const p of MOCK_PLAYERS) {
        const px = ox + p.x * cell + cell / 2
        const py = oy + p.y * cell + cell / 2
        if (px < -avatarSize || py < -avatarSize || px > W + avatarSize || py > H + avatarSize) continue
        const s = avatarSize / 2
        // 头像背景
        ctx.fillStyle = 'rgba(0,0,0,0.6)'
        ctx.fillRect(px - s - 1, py - s - 1, avatarSize + 2, avatarSize + 2)
        ctx.fillStyle = p.color
        ctx.fillRect(px - s, py - s, avatarSize, avatarSize)
        // 像素人脸
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.font = `bold ${Math.max(8, avatarSize * 0.5)}px monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(p.label, px, py + 1)
      }
    }

    // 悬停高亮
    if (hovered && zoom > 1) {
      const { x, y } = hovered
      const cx = ox + x * cell, cy = oy + y * cell
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.fillRect(cx, cy, cell - 0.5, cell - 0.5)
    }

    // 选中框
    if (selected) {
      const cx = ox + selected.x * cell, cy = oy + selected.y * cell
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = Math.max(1.5, cell * 0.15)
      ctx.strokeRect(cx + 1, cy + 1, cell - 2, cell - 2)
      // 角点装饰
      const s = Math.max(3, cell * 0.3)
      ctx.fillStyle = '#ffffff'
      ;[[cx, cy], [cx + cell - 2, cy], [cx, cy + cell - 2], [cx + cell - 2, cy + cell - 2]].forEach(([bx, by]) => {
        ctx.fillRect(bx - 1, by - 1, 3, 3)
      })
    }

    // 外边框
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    ctx.lineWidth = 1
    ctx.strokeRect(ox, oy, GRID * cell, GRID * cell)

    // 坐标轴标注
    if (zoom > 1) {
      const step = zoom > 4 ? 5 : zoom > 2 ? 10 : 25
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      ctx.font = '9px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      for (let x = 0; x <= GRID; x += step) {
        const px = ox + x * cell
        if (px > 10 && px < W - 10) ctx.fillText(x, px, oy - 1)
      }
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      for (let y = 0; y <= GRID; y += step) {
        const py = oy + y * cell
        if (py > 10 && py < H - 10) ctx.fillText(y, ox - 3, py)
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

  const toCell = (clientX, clientY) => {
    const c = cvs.current; if (!c) return null
    const rect = c.getBoundingClientRect()
    const cell = BASE_CELL * zoom
    const ox = pan.x + c.width / 2 - (GRID * cell) / 2
    const oy = pan.y + c.height / 2 - (GRID * cell) / 2
    const gx = Math.floor((clientX - rect.left - ox) / cell)
    const gy = Math.floor((clientY - rect.top - oy) / cell)
    if (gx < 0 || gx >= GRID || gy < 0 || gy >= GRID) return null
    return { x: gx, y: gy }
  }

  const onDown = e => { setDrag({ ox: e.clientX - pan.x, oy: e.clientY - pan.y }); setHasMoved(false) }
  const onMove = e => {
    if (drag) {
      if (Math.abs(e.clientX - (drag.ox + pan.x)) > 3 || Math.abs(e.clientY - (drag.oy + pan.y)) > 3) setHasMoved(true)
      setPan({ x: e.clientX - drag.ox, y: e.clientY - drag.oy })
    }
    const cell = toCell(e.clientX, e.clientY)
    if (cell && zoom > 1) setHovered(cell)
    else setHovered(null)
  }
  const onUp = e => {
    if (drag && !hasMoved) {
      const cell = toCell(e.clientX, e.clientY)
      if (cell) {
        const tid = cell.x * GRID + cell.y + 1
        const attr = getLandData(cell.x, cell.y)
        setSelected({ ...cell, tokenId: tid, attr })
        setPanelOpen(true)
      }
    }
    setDrag(null)
  }
  const onWheel = e => {
    e.preventDefault()
    const c = cvs.current; if (!c) return
    const rect = c.getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top
    const factor = e.deltaY < 0 ? 1.18 : 0.847
    const newZoom = Math.max(0.25, Math.min(18, zoom * factor))
    const scale = newZoom / zoom
    setPan(p => ({ x: mx - (mx - p.x) * scale, y: my - (my - p.y) * scale }))
    setZoom(newZoom)
  }

  const LEGEND = [
    { color: LAND_COLORS[0], zh: '黄金', en: 'Gold' },
    { color: LAND_COLORS[1], zh: '木材', en: 'Wood' },
    { color: LAND_COLORS[2], zh: '水源', en: 'Water' },
    { color: LAND_COLORS[3], zh: '火焰', en: 'Fire' },
    { color: LAND_COLORS[4], zh: '土地', en: 'Soil' },
  ]

  return (
    <div className="world-map-root">
      {/* 工具栏 */}
      <div className="map-toolbar">
        <div className="map-toolbar-left">
          <span className="map-section-label">🌍 地图 <span style={{color:'#4a5568',fontSize:11}}>World Map</span></span>
          <div className="map-legend">
            {LEGEND.map((l, i) => (
              <span key={i} className="legend-item">
                <span className="legend-dot" style={{ background: l.color }} />
                <span>{l.zh}</span>
                <span style={{color:'#4a5568',fontSize:10}}>{l.en}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="map-toolbar-right">
          <span className="map-zoom-label">{(zoom * 100).toFixed(0)}%</span>
          <button className="map-tool-btn" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}>重置 Reset</button>
        </div>
      </div>

      {/* 地图主体 */}
      <div className="map-body">
        <div className="map-canvas-wrap">
          <canvas
            ref={cvs}
            className="map-canvas"
            style={{ cursor: drag ? 'grabbing' : 'default' }}
            onMouseDown={onDown}
            onMouseMove={onMove}
            onMouseUp={onUp}
            onMouseLeave={e => { setDrag(null); setHovered(null) }}
            onWheel={onWheel}
          />

          {/* 预览提示 */}
          <div className="map-preview-badge">
            <span className="badge-dot" />
            预览模式 · 部署合约后显示真实数据
          </div>

          {/* 缩放控件 */}
          <div className="map-zoom-ctrl">
            <button className="zoom-btn" onClick={() => setZoom(z => Math.min(18, z * 1.3))}>＋</button>
            <div className="zoom-sep" />
            <button className="zoom-btn" onClick={() => setZoom(z => Math.max(0.25, z * 0.77))}>－</button>
          </div>

          {/* 悬停坐标提示 */}
          {hovered && (
            <div className="map-coord-tip">
              ({hovered.x}, {hovered.y}) · ID #{hovered.x * 100 + hovered.y + 1}
            </div>
          )}
        </div>

        {/* 右侧地块详情面板 */}
        {panelOpen && selected && (
          <LandPanel
            land={selected}
            onClose={() => setPanelOpen(false)}
          />
        )}
      </div>

      {/* 未连接提示条 */}
      {!isConnected && (
        <div className="map-bottom-bar">
          <span>连接钱包以查看您的地块并进行交易 · Connect wallet to view your lands and trade</span>
          <ConnectButton chainStatus="none" showBalance={false} />
        </div>
      )}
    </div>
  )
}
