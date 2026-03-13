import { useEffect, useRef, useState, useCallback } from 'react'
import { usePublicClient, useAccount } from 'wagmi'
import { CONTRACTS } from '../constants/contracts'
import { LAND_ABI, AUCTION_ABI } from '../constants/abi'
import './WorldMap.css'

const W = 100, H = 100
const CELL = 7
const ELEM_COLORS = [
  '#f59e0b', // gold
  '#22c55e', // wood
  '#3b82f6', // water
  '#ef4444', // fire
  '#a78bfa', // soil
]

function dominantElement(attr) {
  if (!attr) return 0
  const vals = [
    Number(BigInt(attr) & 0xFFFFn),
    Number((BigInt(attr) >> 16n) & 0xFFFFn),
    Number((BigInt(attr) >> 32n) & 0xFFFFn),
    Number((BigInt(attr) >> 48n) & 0xFFFFn),
    Number((BigInt(attr) >> 64n) & 0xFFFFn),
  ]
  return vals.indexOf(Math.max(...vals))
}

export default function WorldMap() {
  const canvasRef = useRef(null)
  const publicClient = usePublicClient()
  const { address } = useAccount()

  const [attrs, setAttrs] = useState({})  // tokenId => attr
  const [owners, setOwners] = useState({}) // tokenId => address
  const [auctions, setAuctions] = useState({}) // tokenId => bool
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)

  // Load land data in batches
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        // Load first 200 lands
        const ids = Array.from({ length: 200 }, (_, i) => i + 1)
        const [attrResults, ownerResults, auctionResults] = await Promise.all([
          publicClient.multicall({
            contracts: ids.map(id => ({
              address: CONTRACTS.land,
              abi: LAND_ABI,
              functionName: 'resourceAttr',
              args: [BigInt(id)],
            })),
          }),
          publicClient.multicall({
            contracts: ids.map(id => ({
              address: CONTRACTS.land,
              abi: LAND_ABI,
              functionName: 'ownerOf',
              args: [BigInt(id)],
            })),
          }),
          publicClient.multicall({
            contracts: ids.map(id => ({
              address: CONTRACTS.auction,
              abi: AUCTION_ABI,
              functionName: 'auctions',
              args: [BigInt(id)],
            })),
          }),
        ])

        const newAttrs = {}
        const newOwners = {}
        const newAuctions = {}
        ids.forEach((id, i) => {
          if (attrResults[i]?.result)  newAttrs[id]   = attrResults[i].result
          if (ownerResults[i]?.result) newOwners[id]  = ownerResults[i].result
          const auc = auctionResults[i]?.result
          if (auc && auc[4] > 0n)      newAuctions[id] = true  // startedAt > 0
        })
        setAttrs(newAttrs)
        setOwners(newOwners)
        setAuctions(newAuctions)
      } catch (e) {
        console.error('load map error', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [publicClient])

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const size = CELL

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (let x = 0; x < W; x++) {
      for (let y = 0; y < H; y++) {
        const id = x * 100 + y + 1
        const attr  = attrs[id]
        const owner = owners[id]
        const isAuction = auctions[id]
        const isMe = owner && address && owner.toLowerCase() === address.toLowerCase()
        const elem = dominantElement(attr)

        let color = '#1e293b'
        if (attr) color = ELEM_COLORS[elem] + '66'
        if (isAuction) color = '#fbbf24'
        if (isMe) color = '#00ff88'

        ctx.fillStyle = color
        ctx.fillRect(x * size, y * size, size - 1, size - 1)

        if (selected === id) {
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 1.5
          ctx.strokeRect(x * size, y * size, size - 1, size - 1)
        }
      }
    }
  }, [attrs, owners, auctions, selected, address])

  function handleClick(e) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const sx = (e.clientX - rect.left) / rect.width  * canvas.width
    const sy = (e.clientY - rect.top)  / rect.height * canvas.height
    const x = Math.floor(sx / CELL)
    const y = Math.floor(sy / CELL)
    if (x < 0 || x >= W || y < 0 || y >= H) return
    const id = x * 100 + y + 1
    setSelected(id)
  }

  const selAttr = selected && attrs[selected]
  const selOwner = selected && owners[selected]
  const selG  = selAttr ? Number(BigInt(selAttr) & 0xFFFFn) : 0
  const selW  = selAttr ? Number((BigInt(selAttr) >> 16n) & 0xFFFFn) : 0
  const selWa = selAttr ? Number((BigInt(selAttr) >> 32n) & 0xFFFFn) : 0
  const selF  = selAttr ? Number((BigInt(selAttr) >> 48n) & 0xFFFFn) : 0
  const selS  = selAttr ? Number((BigInt(selAttr) >> 64n) & 0xFFFFn) : 0

  return (
    <div className="world-map-page">
      <div className="map-container">
        {loading && <div className="map-loading">⏳ 从链上加载地图数据…</div>}
        <canvas
          ref={canvasRef}
          width={W * CELL}
          height={H * CELL}
          className="map-canvas"
          onClick={handleClick}
          style={{ cursor: 'crosshair' }}
        />
      </div>

      <div className="map-legend">
        <div className="legend-item"><span style={{background:'#fbbf24'}} /> 拍卖中</div>
        <div className="legend-item"><span style={{background:'#00ff88'}} /> 我的地块</div>
        <div className="legend-item"><span style={{background:'#f59e0b66'}} /> 金</div>
        <div className="legend-item"><span style={{background:'#22c55e66'}} /> 木</div>
        <div className="legend-item"><span style={{background:'#3b82f666'}} /> 水</div>
        <div className="legend-item"><span style={{background:'#ef444466'}} /> 火</div>
        <div className="legend-item"><span style={{background:'#a78bfa66'}} /> 土</div>
      </div>

      {selected && (
        <div className="land-detail">
          <h3>地块 #{selected}</h3>
          <div className="detail-attrs">
            <span>⛏️ {selG}</span>
            <span>🪵 {selW}</span>
            <span>💧 {selWa}</span>
            <span>🔥 {selF}</span>
            <span>🪨 {selS}</span>
          </div>
          {selOwner && (
            <div className="detail-owner">
              拥有者: <a href={`https://testnet.bscscan.com/address/${selOwner}`} target="_blank" rel="noreferrer">
                {selOwner.slice(0,8)}…{selOwner.slice(-6)}
              </a>
            </div>
          )}
          {auctions[selected] && (
            <div className="detail-auction">🔨 拍卖中 → <a href="#market" onClick={() => window.location.hash='market'}>去竞拍</a></div>
          )}
        </div>
      )}
    </div>
  )
}
