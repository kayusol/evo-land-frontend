import { useEffect, useRef, useState } from 'react'
import { usePublicClient, useAccount } from 'wagmi'
import { CONTRACTS } from '../constants/contracts'
import { LAND_ABI, AUCTION_ABI } from '../constants/abi'
import './WorldMap.css'

const W = 100, H = 100
const CELL = 6
const ELEM_COLORS = ['#f59e0b', '#22c55e', '#3b82f6', '#ef4444', '#a78bfa']

function dominantElement(attr) {
  if (!attr && attr !== 0n) return 0
  const a = BigInt(attr)
  const vals = [
    Number(a & 0xFFFFn),
    Number((a >> 16n) & 0xFFFFn),
    Number((a >> 32n) & 0xFFFFn),
    Number((a >> 48n) & 0xFFFFn),
    Number((a >> 64n) & 0xFFFFn),
  ]
  return vals.indexOf(Math.max(...vals))
}

export default function WorldMap() {
  const canvasRef = useRef(null)
  const publicClient = usePublicClient()
  const { address } = useAccount()

  const [attrs,    setAttrs]    = useState({})
  const [owners,   setOwners]   = useState({})
  const [auctions, setAuctions] = useState({})
  const [selected, setSelected] = useState(null)
  const [status,   setStatus]   = useState('正在从链上加载地图数据…')
  const [minted,   setMinted]   = useState(0)

  // Load land data
  useEffect(() => {
    let cancelled = false
    async function load() {
      setStatus('正在从链上加载地图数据…')
      try {
        // First check how many lands exist by scanning nextId or totalSupply
        // LandNFT is ERC721 — scan first 500 tokenIds in batches
        const BATCH = 100
        const newAttrs  = {}
        const newOwners = {}
        const newAuctions = {}
        let totalMinted = 0

        for (let start = 1; start <= 500 && !cancelled; start += BATCH) {
          const ids = Array.from({ length: BATCH }, (_, i) => start + i)
          const [attrRes, ownerRes, aucRes] = await Promise.all([
            publicClient.multicall({ contracts: ids.map(id => ({
              address: CONTRACTS.land, abi: LAND_ABI,
              functionName: 'resourceAttr', args: [BigInt(id)],
            })), allowFailure: true }),
            publicClient.multicall({ contracts: ids.map(id => ({
              address: CONTRACTS.land, abi: LAND_ABI,
              functionName: 'ownerOf', args: [BigInt(id)],
            })), allowFailure: true }),
            publicClient.multicall({ contracts: ids.map(id => ({
              address: CONTRACTS.auction, abi: AUCTION_ABI,
              functionName: 'auctions', args: [BigInt(id)],
            })), allowFailure: true }),
          ])

          let batchHasData = false
          ids.forEach((id, i) => {
            const owner = ownerRes[i]?.result
            if (owner && owner !== '0x0000000000000000000000000000000000000000') {
              newOwners[id] = owner
              newAttrs[id]  = attrRes[i]?.result ?? 0n
              batchHasData  = true
              totalMinted++
            }
            const auc = aucRes[i]?.result
            if (auc && auc[4] && auc[4] > 0n) newAuctions[id] = true
          })

          if (!batchHasData && start > 100) break // no more minted lands
        }

        if (cancelled) return
        setAttrs(newAttrs)
        setOwners(newOwners)
        setAuctions(newAuctions)
        setMinted(totalMinted)
        setStatus(totalMinted === 0 ? '链上暂无已铸造地块' : null)
      } catch (e) {
        console.error('map load error', e)
        if (!cancelled) setStatus('加载失败: ' + e.message)
      }
    }
    load()
    return () => { cancelled = true }
  }, [publicClient])

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Grid background
    ctx.fillStyle = '#060d18'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#0e1a2b'
    ctx.lineWidth = 0.5
    for (let x = 0; x <= W; x++) {
      ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, H * CELL); ctx.stroke()
    }
    for (let y = 0; y <= H; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(W * CELL, y * CELL); ctx.stroke()
    }

    // Land cells
    for (let x = 0; x < W; x++) {
      for (let y = 0; y < H; y++) {
        const id = x * 100 + y + 1
        const attr  = attrs[id]
        const owner = owners[id]
        if (!owner) continue

        const isAuction = auctions[id]
        const isMe = address && owner.toLowerCase() === address.toLowerCase()
        const elem  = dominantElement(attr)

        let color = ELEM_COLORS[elem] + '99'
        if (isAuction) color = '#fbbf24cc'
        if (isMe) color = '#00ff88cc'

        ctx.fillStyle = color
        ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2)

        if (selected === id) {
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 1.5
          ctx.strokeRect(x * CELL + 0.75, y * CELL + 0.75, CELL - 1.5, CELL - 1.5)
        }
      }
    }
  }, [attrs, owners, auctions, selected, address])

  function handleCanvasClick(e) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width  / rect.width
    const scaleY = canvas.height / rect.height
    const cx = Math.floor((e.clientX - rect.left)  * scaleX / CELL)
    const cy = Math.floor((e.clientY - rect.top)   * scaleY / CELL)
    if (cx < 0 || cx >= W || cy < 0 || cy >= H) return
    const id = cx * 100 + cy + 1
    setSelected(owners[id] ? id : null)
  }

  const selAttr  = selected ? (attrs[selected] ?? 0n) : null
  const selOwner = selected ? owners[selected] : null
  const decAttr  = (a, shift) => a != null ? Number((BigInt(a) >> BigInt(shift)) & 0xFFFFn) : 0

  return (
    <div className="world-map-page">
      <div className="map-topbar">
        <span className="map-title">🌍 世界地图</span>
        <span className="map-stat">已铸造 <b>{minted}</b> / 10000 块地</span>
        {minted === 0 && (
          <span className="map-hint">⚠️ 链上暂无地块 — 需先运行铸地脚本</span>
        )}
      </div>

      <div className="map-wrap">
        {status && <div className="map-overlay">{status}</div>}
        <canvas
          ref={canvasRef}
          width={W * CELL}
          height={H * CELL}
          className="map-canvas"
          onClick={handleCanvasClick}
        />
      </div>

      <div className="map-bottom">
        <div className="map-legend">
          {[['#fbbf24','拍卖中'],['#00ff88','我的地块'],
            ['#f59e0b','金'],['#22c55e','木'],['#3b82f6','水'],['#ef4444','火'],['#a78bfa','土']
          ].map(([c,l]) => (
            <div key={l} className="legend-item">
              <span style={{ background: c }} />{l}
            </div>
          ))}
        </div>

        {selected && selOwner && (
          <div className="land-panel">
            <div className="lp-title">地块 #{selected}</div>
            <div className="lp-attrs">
              <span>⛏️ {decAttr(selAttr, 0)}</span>
              <span>🪵 {decAttr(selAttr, 16)}</span>
              <span>💧 {decAttr(selAttr, 32)}</span>
              <span>🔥 {decAttr(selAttr, 48)}</span>
              <span>🪨 {decAttr(selAttr, 64)}</span>
            </div>
            <div className="lp-owner">
              拥有者: <a href={`https://testnet.bscscan.com/address/${selOwner}`} target="_blank" rel="noreferrer">
                {selOwner.slice(0,8)}…{selOwner.slice(-6)}
              </a>
            </div>
            {auctions[selected] && (
              <div className="lp-auction">🔨 拍卖中</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
