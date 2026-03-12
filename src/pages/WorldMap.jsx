import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import LandPanel from '../components/LandPanel.jsx'
import { RES_COLORS, LAND_COLORS } from '../constants/contracts.js'
import './WorldMap.css'

const GRID = 100
const BASE_CELL = 9

// 确定性随机 - 生成地块属性
function seedAttr(x, y) {
  const s = Math.abs(Math.sin(x * 127.1 + y * 311.7) * 43758.5453)
  const frac = s - Math.floor(s)
  // 决定主资源类型
  const mainType = Math.floor(frac * 5) // 0-4
  const rates = Array.from({ length: 5 }, (_, i) => {
    const f2 = Math.abs(Math.sin((x + i*7) * 31.1 + y * 97.3) * 8762.1)
    const base = (f2 - Math.floor(f2))
    return i === mainType ? Math.floor(base * 150 + 50) : Math.floor(base * 60 + 5)
  })
  return { mainType, rates }
}

export default function WorldMap() {
  const { isConnected, address } = useAccount()
  const cvs = useRef(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [drag, setDrag] = useState(null)
  const [hasMoved, setHasMoved] = useState(false)
  const [selected, setSelected] = useState(null) // { x, y, tokenId, attr }
  const [panelOpen, setPanelOpen] = useState(false)
  const [myLandIds, setMyLandIds] = useState(new Set())

  // 预生成所有地块数据
  const landData = useMemo(() => {
    const d = {}
    for (let x = 0; x < GRID; x++)
      for (let y = 0; y < GRID; y++)
        d[x * GRID + y] = seedAttr(x, y)
    return d
  }, [])

  const draw = useCallback(() => {
    const c = cvs.current
    if (!c) return
    const ctx = c.getContext('2d')
    const W = c.width, H = c.height
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#0a0f1e'
    ctx.fillRect(0, 0, W, H)

    const cell = BASE_CELL * zoom
    const ox = pan.x + W / 2 - (GRID * cell) / 2
    const oy = pan.y + H / 2 - (GRID * cell) / 2

    for (let x = 0; x < GRID; x++) {
      for (let y = 0; y < GRID; y++) {
        const cx = ox + x * cell
        const cy = oy + y * cell
        if (cx + cell < 0 || cy + cell < 0 || cx > W || cy > H) continue

        const attr = landData[x * GRID + y]
        // 基础颜色按主资源类型
        ctx.fillStyle = LAND_COLORS[attr.mainType]
        ctx.fillRect(cx, cy, cell - 0.5, cell - 0.5)

        // 我的地块高亮
        const tid = x * GRID + y + 1
        if (myLandIds.has(tid)) {
          ctx.fillStyle = 'rgba(255,255,255,0.25)'
          ctx.fillRect(cx, cy, cell - 0.5, cell - 0.5)
        }

        // 选中框
        if (selected?.x === x && selected?.y === y) {
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 2
          ctx.strokeRect(cx + 1, cy + 1, cell - 2.5, cell - 2.5)
        }
      }
    }

    // 网格线 (zoom > 2)
    if (zoom > 2) {
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'
      ctx.lineWidth = 0.5
      for (let x = 0; x <= GRID; x++) {
        ctx.beginPath(); ctx.moveTo(ox + x * cell, oy); ctx.lineTo(ox + x * cell, oy + GRID * cell); ctx.stroke()
      }
      for (let y = 0; y <= GRID; y++) {
        ctx.beginPath(); ctx.moveTo(ox, oy + y * cell); ctx.lineTo(ox + GRID * cell, oy + y * cell); ctx.stroke()
      }
    }

    // 坐标标签 (zoom > 5)
    if (zoom > 5) {
      const fs = Math.min(cell * 0.25, 10)
      ctx.font = `${fs}px 'Noto Sans SC', sans-serif`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillStyle = 'rgba(255,255,255,0.55)'
      for (let x = 0; x < GRID; x++) {
        for (let y = 0; y < GRID; y++) {
          const cx = ox + x * cell, cy = oy + y * cell
          if (cx > W || cy > H || cx + cell < 0 || cy + cell < 0) continue
          ctx.fillText(`${x},${y}`, cx + cell / 2, cy + cell / 2)
        }
      }
    }

    // 边框
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'
    ctx.lineWidth = 1.5
    ctx.strokeRect(ox, oy, GRID * cell, GRID * cell)

    // 坐标轴刻度 (始终显示边缘坐标)
    if (zoom > 0.8) {
      const step = zoom > 3 ? 10 : zoom > 1.5 ? 20 : 50
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.font = '9px monospace'
      ctx.textAlign = 'center'
      for (let x = 0; x <= GRID; x += step) {
        const px = ox + x * cell
        if (px < 0 || px > W) continue
        ctx.fillText(x, px, oy - 4)
      }
      ctx.textAlign = 'right'
      for (let y = 0; y <= GRID; y += step) {
        const py = oy + y * cell
        if (py < 0 || py > H) continue
        ctx.fillText(y, ox - 3, py + 3)
      }
    }
  }, [zoom, pan, selected, landData, myLandIds])

  useEffect(() => { draw() }, [draw])

  useEffect(() => {
    const resize = () => {
      const c = cvs.current; if (!c) return
      const p = c.parentElement
      c.width = p.offsetWidth
      c.height = p.offsetHeight
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

  const onDown = (e) => {
    setDrag({ ox: e.clientX - pan.x, oy: e.clientY - pan.y })
    setHasMoved(false)
  }
  const onMove = (e) => {
    if (!drag) return
    const dx = Math.abs(e.clientX - (drag.ox + pan.x))
    const dy = Math.abs(e.clientY - (drag.oy + pan.y))
    if (dx > 4 || dy > 4) setHasMoved(true)
    setPan({ x: e.clientX - drag.ox, y: e.clientY - drag.oy })
  }
  const onUp = (e) => {
    if (drag && !hasMoved) {
      const cell = toCell(e.clientX, e.clientY)
      if (cell) {
        const tid = cell.x * GRID + cell.y + 1
        const attr = landData[cell.x * GRID + cell.y]
        setSelected({ ...cell, tokenId: tid, attr })
        setPanelOpen(true)
      }
    }
    setDrag(null)
  }
  const onWheel = (e) => {
    e.preventDefault()
    // 以鼠标位置为中心缩放
    const c = cvs.current; if (!c) return
    const rect = c.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const factor = e.deltaY < 0 ? 1.18 : 0.85
    const newZoom = Math.max(0.3, Math.min(15, zoom * factor))
    const scale = newZoom / zoom
    const cx = c.width / 2 + pan.x
    const cy = c.height / 2 + pan.y
    setPan(p => ({
      x: mx - (mx - p.x) * scale - c.width / 2 + c.width / 2,
      y: my - (my - p.y) * scale - c.height / 2 + c.height / 2,
    }))
    setZoom(newZoom)
  }

  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }) }

  // 图例
  const legendItems = [
    { color: 'rgba(251,191,36,0.75)', zh: '黄金', en: 'Gold' },
    { color: 'rgba(74,222,128,0.75)', zh: '木材', en: 'Wood' },
    { color: 'rgba(45,212,191,0.75)', zh: '水源', en: 'Water' },
    { color: 'rgba(248,113,113,0.75)', zh: '火焰', en: 'Fire' },
    { color: 'rgba(167,139,250,0.75)', zh: '土地', en: 'Soil' },
  ]

  return (
    <div className="world-map-root">
      {/* 工具栏 */}
      <div className="map-toolbar">
        <div className="map-toolbar-left">
          <span className="map-title">世界地图 <span style={{ fontSize:11, color:'#475569' }}>World Map</span></span>
          <div className="map-legend">
            {legendItems.map((l, i) => (
              <span key={i} className="legend-item">
                <span className="legend-dot" style={{ background: l.color }} />
                {l.zh}
              </span>
            ))}
          </div>
        </div>
        <div className="map-toolbar-right">
          <span style={{ fontSize:11, color:'#475569', fontFamily:'monospace' }}>
            {zoom.toFixed(1)}x · 100×100格
          </span>
          <button className="btn btn-sm" onClick={resetView}>重置视图</button>
        </div>
      </div>

      {/* 地图容器 */}
      <div className="map-body">
        <div className="map-canvas-wrap">
          <canvas
            ref={cvs}
            className="map-canvas"
            style={{ cursor: drag ? 'grabbing' : 'crosshair' }}
            onMouseDown={onDown}
            onMouseMove={onMove}
            onMouseUp={onUp}
            onMouseLeave={onUp}
            onWheel={onWheel}
          />

          {/* 预览模式标签 */}
          <div className="map-preview-badge">
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#fbbf24', display:'inline-block', animation:'pulse 2s infinite' }} />
            预览模式 · 部署合约后显示链上数据
          </div>

          {/* 缩放控件 */}
          <div className="map-zoom-ctrl">
            <button className="zoom-btn" onClick={() => setZoom(z => Math.min(15, z * 1.3))}>＋</button>
            <div className="zoom-val">{(zoom * 100).toFixed(0)}%</div>
            <button className="zoom-btn" onClick={() => setZoom(z => Math.max(0.3, z * 0.77))}>－</button>
          </div>
        </div>

        {/* 地块详情面板 */}
        {panelOpen && selected && (
          <LandPanel
            land={selected}
            onClose={() => setPanelOpen(false)}
            myLandIds={myLandIds}
          />
        )}
      </div>

      {/* 未连接提示 - 不阻止地图，只在底部提示 */}
      {!isConnected && (
        <div className="map-connect-hint">
          <span>连接钱包以查看您的地块和进行交易</span>
          <ConnectButton chainStatus="none" showBalance={false} />
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
      `}</style>
    </div>
  )
}
