import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import LandPanel from '../components/LandPanel.jsx'
import { LAND_COLORS, RES_NAMES_ZH, RES_COLORS } from '../constants/contracts.js'
import './WorldMap.css'

const GRID = 100
// 与原版一致: 小格紧密排列，默认约16x16px per cell
const BASE_CELL = 16

// Voronoi 分区 - 还原原版大色块分布
function buildRegionMap() {
  // 仔细观察截图: 大片红色(fire=3)占主体左侧, 蓝紫(water/soil=2/4)在右侧,
  // 青绿(wood=1)少量散落, 黄金(gold=0)极少
  const seeds = [
    // 大片红色区域 (fire=3)
    {x:10,y:10,t:3},{x:25,y:15,t:3},{x:15,y:30,t:3},{x:30,y:40,t:3},
    {x:5,y:50,t:3},{x:20,y:60,t:3},{x:35,y:25,t:3},{x:8,y:75,t:3},
    // 蓝紫区域 (water=2 / soil=4 混合)
    {x:60,y:10,t:2},{x:75,y:20,t:4},{x:85,y:15,t:2},{x:65,y:35,t:4},
    {x:80,y:45,t:2},{x:90,y:30,t:4},{x:70,y:55,t:2},{x:88,y:62,t:4},
    {x:55,y:50,t:2},{x:95,y:50,t:4},{x:72,y:75,t:2},{x:85,y:80,t:4},
    // 青绿(wood=1) 少量
    {x:42,y:35,t:1},{x:50,y:55,t:1},{x:38,y:70,t:1},{x:55,y:75,t:1},
    {x:30,y:85,t:1},{x:60,y:85,t:1},
    // 黄金(gold=0) 极少
    {x:48,y:20,t:0},{x:35,y:55,t:0},{x:45,y:88,t:0},
  ]
  const map = new Uint8Array(GRID * GRID)
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const nx = x + Math.sin(y * 0.31) * 3.5
      const ny = y + Math.cos(x * 0.23) * 3.5
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
  return Array.from({length:5}, (_,i) => {
    const v = Math.abs(Math.sin((x*(i*1.7+2)+y*(i*1.3+1.5))*0.41+i)*255)
    return i===mainType ? Math.floor(v%160+60) : Math.floor(v%55+2)
  })
}

// 模拟玩家头像 (像素图标)
const PLAYER_COLORS = ['#c0392b','#2980b9','#27ae60','#8e44ad','#d68910','#148f77','#e74c3c','#3498db']
const MOCK_PLAYERS = Array.from({length:120}, (_,i) => ({
  x: Math.floor(Math.abs(Math.sin(i*2.7+1)*100)) % 100,
  y: Math.floor(Math.abs(Math.cos(i*1.9+2)*100)) % 100,
  color: PLAYER_COLORS[i % PLAYER_COLORS.length],
  hasImg: i % 4 === 0,   // 25%有头像图
  label: String.fromCharCode(65 + (i%26)),
}))

export default function WorldMap() {
  const { isConnected } = useAccount()
  const cvs  = useRef(null)
  const mini = useRef(null)
  const [zoom, setZoom]         = useState(1)
  const [pan, setPan]           = useState({ x: 0, y: 0 })
  const [drag, setDrag]         = useState(null)
  const [moved, setMoved]       = useState(false)
  const [selected, setSelected] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [hovered, setHovered]   = useState(null)
  const [searchX, setSearchX]   = useState('')
  const [searchY, setSearchY]   = useState('')

  const regionMap = useMemo(() => buildRegionMap(), [])
  const getLand   = useCallback((x,y) => {
    const t = regionMap[y*GRID+x]
    return { mainType:t, rates:seedRates(x,y,t) }
  }, [regionMap])

  const draw = useCallback(() => {
    const c = cvs.current; if (!c) return
    const ctx = c.getContext('2d')
    const W = c.width, H = c.height
    ctx.clearRect(0,0,W,H)
    ctx.fillStyle = '#0a1020'; ctx.fillRect(0,0,W,H)

    const cell = BASE_CELL * zoom
    const ox = pan.x + W/2 - GRID*cell/2
    const oy = pan.y + H/2 - GRID*cell/2

    // ===== 地块 =====
    for (let y=0; y<GRID; y++) {
      for (let x=0; x<GRID; x++) {
        const cx = ox+x*cell, cy = oy+y*cell
        if (cx+cell<0||cy+cell<0||cx>W||cy>H) continue
        const t = regionMap[y*GRID+x]
        ctx.fillStyle = LAND_COLORS[t]
        // 小格之间有1px缝隙，与原版一致
        ctx.fillRect(cx, cy, cell-1, cell-1)
      }
    }

    // ===== 网格线 (原版始终有) =====
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'
    ctx.lineWidth = 0.5
    // 只在合理缩放下绘制，性能优化
    if (cell > 4) {
      for (let x=0; x<=GRID; x++) {
        const px = ox+x*cell
        if (px < -1 || px > W+1) continue
        ctx.beginPath(); ctx.moveTo(px,Math.max(0,oy)); ctx.lineTo(px,Math.min(H,oy+GRID*cell)); ctx.stroke()
      }
      for (let y=0; y<=GRID; y++) {
        const py = oy+y*cell
        if (py < -1 || py > H+1) continue
        ctx.beginPath(); ctx.moveTo(Math.max(0,ox),py); ctx.lineTo(Math.min(W,ox+GRID*cell),py); ctx.stroke()
      }
    }

    // ===== 玩家头像 (原版每格可能有玩家头像) =====
    if (cell >= 8) {
      for (const p of MOCK_PLAYERS) {
        const cx = ox+p.x*cell, cy = oy+p.y*cell
        if (cx+cell<0||cy+cell<0||cx>W||cy>H) continue
        const s = Math.min(cell-2, 14)
        const ax = cx + (cell-s)/2, ay = cy + (cell-s)/2
        // 像素头像背景
        ctx.fillStyle = p.color
        ctx.fillRect(ax, ay, s, s)
        // 高亮边框
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'
        ctx.lineWidth = 0.5
        ctx.strokeRect(ax, ay, s, s)
        // 眼睛像素
        if (s >= 10) {
          ctx.fillStyle = 'rgba(255,255,255,0.9)'
          const ew = Math.max(1, s*0.15)
          ctx.fillRect(ax+s*0.2, ay+s*0.25, ew, ew)
          ctx.fillRect(ax+s*0.55, ay+s*0.25, ew, ew)
        }
      }
    }

    // ===== 坐标标注 (高缩放) =====
    if (zoom > 4) {
      ctx.font = `${Math.min(cell*0.22,8)}px monospace`
      ctx.textAlign='center'; ctx.textBaseline='bottom'
      ctx.fillStyle='rgba(255,255,255,0.5)'
      for (let y=0; y<GRID; y++) {
        for (let x=0; x<GRID; x++) {
          const cx=ox+x*cell, cy=oy+y*cell
          if (cx<-cell||cy<-cell||cx>W||cy>H) continue
          ctx.fillText(`${x},${y}`, cx+cell/2, cy+cell-2)
        }
      }
    }

    // ===== 悬停高亮 =====
    if (hovered && zoom > 0.5) {
      const cx=ox+hovered.x*cell, cy=oy+hovered.y*cell
      ctx.fillStyle='rgba(255,255,255,0.18)'
      ctx.fillRect(cx,cy,cell-1,cell-1)
    }

    // ===== 选中框 =====
    if (selected) {
      const cx=ox+selected.x*cell, cy=oy+selected.y*cell
      const lw = Math.max(1.5, cell*0.1)
      ctx.strokeStyle='#ffffff'; ctx.lineWidth=lw
      ctx.strokeRect(cx+lw/2, cy+lw/2, cell-lw-1, cell-lw-1)
    }

    // ===== 世界边框 =====
    ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=2
    ctx.strokeRect(ox, oy, GRID*cell, GRID*cell)

    // 坐标轴
    if (zoom > 0.5) {
      const step = zoom>3?5:zoom>1.5?10:zoom>0.8?20:50
      ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.font='9px monospace'
      ctx.textAlign='center'; ctx.textBaseline='bottom'
      for (let x=0; x<=GRID; x+=step) {
        const px=ox+x*cell
        if (px>14&&px<W-14) ctx.fillText(x, px, oy-2)
      }
      ctx.textAlign='right'; ctx.textBaseline='middle'
      for (let y=0; y<=GRID; y+=step) {
        const py=oy+y*cell
        if (py>14&&py<H-14) ctx.fillText(y, ox-4, py)
      }
    }
  }, [zoom, pan, selected, hovered, regionMap])

  // 小地图
  const drawMini = useCallback(() => {
    const m = mini.current; if (!m) return
    const ctx = m.getContext('2d')
    const W=m.width, H=m.height, cs=W/GRID
    for (let y=0;y<GRID;y++) for (let x=0;x<GRID;x++) {
      ctx.fillStyle = LAND_COLORS[regionMap[y*GRID+x]]
      ctx.fillRect(x*cs, y*cs, cs, cs)
    }
    const c=cvs.current; if (!c) return
    const cell=BASE_CELL*zoom
    const ox=pan.x+c.width/2-GRID*cell/2
    const oy=pan.y+c.height/2-GRID*cell/2
    const vx=Math.max(0,-ox/cell), vy=Math.max(0,-oy/cell)
    const vw=Math.min(GRID,c.width/cell), vh=Math.min(GRID,c.height/cell)
    ctx.strokeStyle='rgba(255,255,255,0.9)'; ctx.lineWidth=1
    ctx.strokeRect(vx*cs, vy*cs, vw*cs, vh*cs)
    if (selected) {
      ctx.fillStyle='#fff'
      ctx.fillRect(selected.x*cs-1, selected.y*cs-1, cs+2, cs+2)
    }
  }, [zoom, pan, selected, regionMap])

  useEffect(()=>{ draw() },[draw])
  useEffect(()=>{ drawMini() },[drawMini])
  useEffect(()=>{
    const resize=()=>{
      const c=cvs.current; if (!c) return
      const p=c.parentElement
      c.width=p.offsetWidth; c.height=p.offsetHeight; draw()
    }
    resize()
    window.addEventListener('resize',resize)
    return ()=>window.removeEventListener('resize',resize)
  },[draw])

  const toCell=(cx,cy)=>{
    const c=cvs.current; if (!c) return null
    const r=c.getBoundingClientRect()
    const cell=BASE_CELL*zoom
    const ox=pan.x+c.width/2-GRID*cell/2
    const oy=pan.y+c.height/2-GRID*cell/2
    const gx=Math.floor((cx-r.left-ox)/cell)
    const gy=Math.floor((cy-r.top-oy)/cell)
    if (gx<0||gx>=GRID||gy<0||gy>=GRID) return null
    return {x:gx,y:gy}
  }

  const onDown=e=>{ setDrag({ox:e.clientX-pan.x,oy:e.clientY-pan.y}); setMoved(false) }
  const onMove=e=>{
    if (drag) {
      if (Math.abs(e.clientX-drag.ox-pan.x)>3||Math.abs(e.clientY-drag.oy-pan.y)>3) setMoved(true)
      setPan({x:e.clientX-drag.ox,y:e.clientY-drag.oy})
    }
    setHovered(toCell(e.clientX,e.clientY))
  }
  const onUp=e=>{
    if (drag&&!moved) {
      const cell=toCell(e.clientX,e.clientY)
      if (cell) {
        setSelected({...cell,tokenId:cell.x*GRID+cell.y+1,attr:getLand(cell.x,cell.y)})
        setPanelOpen(true)
      }
    }
    setDrag(null)
  }
  const onWheel=e=>{
    e.preventDefault()
    const c=cvs.current; if (!c) return
    const r=c.getBoundingClientRect()
    const mx=e.clientX-r.left, my=e.clientY-r.top
    const f=e.deltaY<0?1.18:0.847
    const nz=Math.max(0.2,Math.min(10,zoom*f))
    const sc=nz/zoom
    setPan(p=>({x:mx-(mx-p.x)*sc,y:my-(my-p.y)*sc}))
    setZoom(nz)
  }
  const jumpTo=()=>{
    const gx=parseInt(searchX), gy=parseInt(searchY)
    if (isNaN(gx)||isNaN(gy)||gx<0||gx>=GRID||gy<0||gy>=GRID) return
    const c=cvs.current; if (!c) return
    const tz=Math.max(zoom,3)
    const cell=BASE_CELL*tz
    setZoom(tz)
    setPan({x:c.width/2-gx*cell-cell/2, y:c.height/2-gy*cell-cell/2})
    setSelected({x:gx,y:gy,tokenId:gx*GRID+gy+1,attr:getLand(gx,gy)})
    setPanelOpen(true)
  }
  const onMiniClick=e=>{
    const m=mini.current; if (!m) return
    const r=m.getBoundingClientRect()
    const gx=Math.floor((e.clientX-r.left)/(m.width/GRID))
    const gy=Math.floor((e.clientY-r.top)/(m.height/GRID))
    if (gx<0||gx>=GRID||gy<0||gy>=GRID) return
    const c=cvs.current; if (!c) return
    const cell=BASE_CELL*zoom
    setPan({x:c.width/2-gx*cell-cell/2, y:c.height/2-gy*cell-cell/2})
  }

  const LEGEND=[
    {color:LAND_COLORS[3],zh:'火焰',en:'Fire'},
    {color:LAND_COLORS[2],zh:'水源',en:'Water'},
    {color:LAND_COLORS[4],zh:'土地',en:'Soil'},
    {color:LAND_COLORS[1],zh:'木材',en:'Wood'},
    {color:LAND_COLORS[0],zh:'黄金',en:'Gold'},
  ]

  return (
    <div className="wm-root">
      {/* 工具栏 */}
      <div className="wm-toolbar">
        <div className="wm-tb-left">
          <span className="wm-title">🗺 地图</span>
          <div className="wm-legend">
            {LEGEND.map((l,i)=>(
              <span key={i} className="wm-leg-item">
                <b className="wm-leg-dot" style={{background:l.color}} />
                {l.zh}
              </span>
            ))}
          </div>
        </div>
        <div className="wm-tb-right">
          <div className="wm-search">
            <input className="wm-si" type="number" placeholder="X" value={searchX}
              onChange={e=>setSearchX(e.target.value)} onKeyDown={e=>e.key==='Enter'&&jumpTo()} min="0" max="99"/>
            <span>,</span>
            <input className="wm-si" type="number" placeholder="Y" value={searchY}
              onChange={e=>setSearchY(e.target.value)} onKeyDown={e=>e.key==='Enter'&&jumpTo()} min="0" max="99"/>
            <button className="btn btn-xs wm-go" onClick={jumpTo}>Go</button>
          </div>
          <span style={{fontSize:10,color:'#334155',fontFamily:'monospace'}}>{(zoom*100).toFixed(0)}%</span>
          <button className="btn btn-xs btn-ghost" onClick={()=>{setZoom(1);setPan({x:0,y:0})}}>重置</button>
        </div>
      </div>

      <div className="wm-body">
        <div className="wm-canvas-wrap">
          <canvas ref={cvs} className="wm-canvas"
            style={{cursor:drag?'grabbing':'crosshair'}}
            onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}
            onMouseLeave={()=>{setDrag(null);setHovered(null)}}
            onWheel={onWheel}
          />

          {/* 顶部提示 */}
          <div className="wm-badge">
            <span className="wm-bdot"/> 预览模式 · 部署合约后显示真实数据
          </div>

          {/* 坐标提示 */}
          {hovered && (
            <div className="wm-coord">
              ({hovered.x}, {hovered.y}) · #{hovered.x*100+hovered.y+1}
            </div>
          )}

          {/* 小地图 */}
          <div className="wm-mini">
            <div className="wm-mini-lbl">小地图</div>
            <canvas ref={mini} width={120} height={120} className="wm-mini-cvs" onClick={onMiniClick}/>
          </div>

          {/* 缩放 */}
          <div className="wm-zoom">
            <button className="wm-zbtn" onClick={()=>setZoom(z=>Math.min(10,z*1.3))}>＋</button>
            <div className="wm-zsep"/>
            <button className="wm-zbtn" onClick={()=>setZoom(z=>Math.max(0.2,z*0.77))}>－</button>
          </div>
        </div>

        {panelOpen && selected && (
          <LandPanel land={selected} onClose={()=>{setPanelOpen(false);setSelected(null)}}/>
        )}
      </div>

      {!isConnected && (
        <div className="wm-connect-bar">
          <span>连接钱包以查看您的地块并进行交易</span>
          <ConnectButton chainStatus="none" showBalance={false}/>
        </div>
      )}
    </div>
  )
}
