import React, { useState, useEffect } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { formatEther, getContract, maxUint256 } from 'viem'
import { CONTRACTS, RES_EMOJIS, RES_COLORS, LAND_COLORS, isDeployed } from '../constants/contracts.js'
import { LAND_ABI, AUCTION_ABI, ERC20_ABI } from '../constants/abi.js'
import { useToast } from '../contexts/ToastContext.jsx'

function decodeRates(attr80) {
  const n = BigInt(attr80)
  return Array.from({ length: 5 }, (_, i) => Number((n >> BigInt(i * 16)) & 0xFFFFn))
}

export default function AuctionPage() {
  const { address } = useAccount()
  const pub = usePublicClient()
  const { data: wal } = useWalletClient()
  const { toast } = useToast()
  const [list,    setList]    = useState([])
  const [loading, setLoading] = useState(false)
  const [txKey,   setTxKey]   = useState('')
  const [tick,    setTick]    = useState(Math.floor(Date.now() / 1000))
  const dep = isDeployed('auction')

  // 实时价格更新
  useEffect(() => { const t = setInterval(() => setTick(Math.floor(Date.now() / 1000)), 5000); return () => clearInterval(t) }, [])

  const load = async () => {
    if (!pub || !dep) return
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
          return { id, x: Number(x), y: Number(y), seller: a.seller, sp: a.startPrice, ep: a.endPrice, dur: Number(a.duration), sa: Number(a.startedAt), price, rates: decodeRates(attr) }
        } catch { return null }
      }))).filter(Boolean).sort((a, b) => b.sa - a.sa)
      setList(items)
    } catch (e) { toast.err('加载失败', e.message?.slice(0, 60)) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [dep])

  const bid = async item => {
    if (!wal) { toast.err('请先连接钱包', ''); return }
    setTxKey('b' + item.id)
    try {
      const rc = getContract({ address: CONTRACTS.ring,    abi: ERC20_ABI,    client: wal })
      const aC = getContract({ address: CONTRACTS.auction, abi: AUCTION_ABI, client: wal })
      const allow = await pub.readContract({ address: CONTRACTS.ring, abi: ERC20_ABI, functionName: 'allowance', args: [address, CONTRACTS.auction] })
      if (allow < item.price) {
        const h = await rc.write.approve([CONTRACTS.auction, maxUint256])
        await pub.waitForTransactionReceipt({ hash: h })
      }
      const h = await aC.write.bid([BigInt(item.id), item.price])
      await pub.waitForTransactionReceipt({ hash: h })
      toast.ok('竞拍成功！', `地块 #${item.id} 已归您所有`)
      load()
    } catch (e) { toast.err('竞拍失败', e.message?.slice(0, 80)) }
    finally { setTxKey('') }
  }

  const pct = a => Math.min(100, ((tick - a.sa) / a.dur) * 100)
  const rem = a => {
    const s = a.dur - (tick - a.sa)
    if (s <= 0) return '已结束'
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60)
    return d > 0 ? `${d}天${h}时` : h > 0 ? `${h}时${m}分` : `${m}分钟`
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* 标题栏 */}
      <div style={{
        padding: '11px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexShrink: 0, flexWrap: 'wrap', gap: 8,
      }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9' }}>拍卖市场</h2>
          <p style={{ fontSize: 12, color: '#334155' }}>Auction Market · 荷兰拍卖，价格随时间降低</p>
        </div>
        <button className="btn btn-sm" onClick={load} disabled={loading}>
          {loading ? <span className="spin-anim">◌</span> : '↻'} 刷新
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {!dep ? (
          <div className="notice-bar"><span className="notice-icon">⚠</span>合约未部署，请填写 src/constants/contracts.js</div>
        ) : loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(255px,1fr))', gap: 14 }}>
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 235 }} />)}
          </div>
        ) : list.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏛</div>
            <h4>暂无拍卖</h4>
            <p>当前没有地块在拍卖中</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(255px,1fr))', gap: 14 }}>
            {list.map(a => {
              const mt = a.rates.indexOf(Math.max(...a.rates))
              const tc = LAND_COLORS[mt]
              const isMine = address?.toLowerCase() === a.seller.toLowerCase()
              return (
                <div key={a.id} style={{
                  background: '#1a2540',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 10, overflow: 'hidden',
                }}>
                  {/* 色块头 */}
                  <div style={{ height: 48, background: tc, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'absolute', left: 8, top: 7 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.9)', background: 'rgba(0,0,0,0.45)', padding: '1px 6px', borderRadius: 4 }}>
                        #{String(a.id).padStart(5,'0')}
                      </span>
                    </div>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', background: 'rgba(0,0,0,0.45)', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
                      ⏱ {rem(a)}
                    </span>
                    <div style={{ position: 'absolute', right: 8, top: 7 }}>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', background: 'rgba(0,0,0,0.45)', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace' }}>
                        ({a.x},{a.y})
                      </span>
                    </div>
                  </div>

                  <div style={{ padding: 12 }}>
                    {/* 资源进度条 */}
                    <div style={{ marginBottom: 10 }}>
                      {a.rates.map((r, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                          <span style={{ fontSize: 12, width: 16 }}>{RES_EMOJIS[i]}</span>
                          <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.min(100,(r/255)*100)}%`, background: RES_COLORS[i] }} />
                          </div>
                          <span style={{ fontFamily: 'Rajdhani,monospace', fontSize: 11, fontWeight: 700, color: RES_COLORS[i], minWidth: 26, textAlign: 'right' }}>{r}</span>
                        </div>
                      ))}
                    </div>

                    {/* 荷兰拍卖价格轨道 */}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, position: 'relative', marginBottom: 4 }}>
                        <div style={{ position: 'absolute', height: '100%', left: 0, width: `${pct(a)}%`, background: 'rgba(251,191,36,0.2)', borderRadius: 2 }} />
                        <div style={{
                          position: 'absolute', top: '50%', left: `${pct(a)}%`,
                          transform: 'translate(-50%,-50%)',
                          width: 10, height: 10, background: '#fbbf24',
                          borderRadius: '50%', boxShadow: '0 0 6px #fbbf24',
                          transition: 'left 0.5s',
                        }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#334155' }}>
                        <span>起 {parseFloat(formatEther(a.sp)).toFixed(1)} RING</span>
                        <span>底 {parseFloat(formatEther(a.ep)).toFixed(1)} RING</span>
                      </div>
                    </div>

                    {/* 当前价格 + 购买 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 21, fontWeight: 800, color: '#fbbf24', fontFamily: 'Rajdhani,monospace', lineHeight: 1 }}>
                          {parseFloat(formatEther(a.price)).toFixed(2)}
                        </div>
                        <div style={{ fontSize: 10, color: '#334155' }}>RING · 当前价格</div>
                      </div>
                      {isMine ? (
                        <span className="tag tag-green" style={{ fontSize: 10 }}>我的上架</span>
                      ) : (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => bid(a)}
                          disabled={!!txKey}
                        >
                          {txKey === 'b' + a.id ? <span className="spin-anim">◌</span> : null} 立即购买
                        </button>
                      )}
                    </div>

                    <div style={{ fontSize: 9, color: '#1e2a3a', marginTop: 8, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      卖家 Seller: {a.seller.slice(0,8)}...{a.seller.slice(-4)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
