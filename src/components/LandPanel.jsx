import React, { useState, useEffect, useCallback } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { parseEther, getContract, formatEther } from 'viem'
import {
  CONTRACTS, RES_NAMES_ZH, RES_NAMES_EN,
  RES_EMOJIS, RES_COLORS, LAND_COLORS, isDeployed,
} from '../constants/contracts.js'
import { LAND_ABI, AUCTION_ABI, MINING_ABI } from '../constants/abi.js'
import { useToast } from '../contexts/ToastContext.jsx'
import './LandPanel.css'

const TYPE_ZH   = ['黄金大陆', '木材森林', '水源绿洲', '火焰熔岩', '土地荒原']
const TYPE_EN   = ['Gold', 'Wood', 'Water', 'Fire', 'Soil']
const CONTINENT = 'BSC 测试网 (Testnet)'

export default function LandPanel({ land, onClose }) {
  const { address } = useAccount()
  const pub = usePublicClient()
  const { data: wal } = useWalletClient()
  const { toast } = useToast()
  const { x, y, tokenId, attr } = land

  const [chainData, setChainData] = useState(null)  // { owner, rates, slots, pending }
  const [loading, setLoading]     = useState(false)
  const [section, setSection]     = useState('info') // 'info' | 'auction'
  const [aForm, setAForm]         = useState({ start: '10', end: '1', days: '7' })
  const [tx, setTx]               = useState('')

  const mainColor = LAND_COLORS[attr.mainType]
  const isDepl    = isDeployed('land')

  // 拉取链上数据
  const fetchChain = useCallback(async () => {
    if (!pub || !isDepl) return
    setLoading(true)
    try {
      const lc = getContract({ address: CONTRACTS.land, abi: LAND_ABI, client: pub })
      const owner = await lc.read.ownerOf([BigInt(tokenId)])
      const raw80 = await lc.read.resourceAttr([BigInt(tokenId)])
      const n     = BigInt(raw80)
      const rates = Array.from({ length: 5 }, (_, i) => Number((n >> BigInt(i * 16)) & 0xFFFFn))

      let slots = [], pending = []
      if (isDeployed('mining')) {
        const mc  = getContract({ address: CONTRACTS.mining, abi: MINING_ABI, client: pub })
        const cnt = Number(await mc.read.slotCount([BigInt(tokenId)]))
        const sd  = await Promise.all(
          Array.from({ length: cnt }, (_, i) => mc.read.slots([BigInt(tokenId), BigInt(i)]))
        )
        slots   = sd.map(s => ({ apo: Number(s.apostleId), drill: Number(s.drillId), t: Number(s.startTime) }))
        const rw = await mc.read.pendingRewards([BigInt(tokenId)])
        pending  = Array.from(rw).map(r => parseFloat(formatEther(r)))
      }
      setChainData({ owner, rates, slots, pending })
    } catch {}
    finally { setLoading(false) }
  }, [tokenId, pub, isDepl])

  useEffect(() => { fetchChain() }, [fetchChain])

  const isMine = !!(address && chainData?.owner?.toLowerCase() === address?.toLowerCase())
  const rates  = chainData?.rates ?? attr.rates
  const maxVal = Math.max(...rates, 1)

  // ── 创建荷兰拍卖 ──────────────────────────────────────
  const doCreateAuction = async () => {
    if (!wal) return
    setTx('auction')
    try {
      const lc = getContract({ address: CONTRACTS.land, abi: LAND_ABI, client: wal })
      const ac = getContract({ address: CONTRACTS.auction, abi: AUCTION_ABI, client: wal })
      const approved = await pub.readContract({
        address: CONTRACTS.land, abi: LAND_ABI,
        functionName: 'getApproved', args: [BigInt(tokenId)],
      })
      if (approved.toLowerCase() !== CONTRACTS.auction.toLowerCase()) {
        const h = await lc.write.approve([CONTRACTS.auction, BigInt(tokenId)])
        await pub.waitForTransactionReceipt({ hash: h })
      }
      const h = await ac.write.createAuction([
        BigInt(tokenId),
        parseEther(aForm.start),
        parseEther(aForm.end),
        BigInt(Number(aForm.days) * 86400),
      ])
      await pub.waitForTransactionReceipt({ hash: h })
      toast.ok('拍卖创建成功', `地块 #${tokenId} 已上架`)
      setSection('info')
    } catch (e) { toast.err('操作失败', e.message?.slice(0, 80)) }
    finally { setTx('') }
  }

  // ── 领取资源 ──────────────────────────────────────────
  const doClaim = async () => {
    if (!wal) return
    setTx('claim')
    try {
      const mc = getContract({ address: CONTRACTS.mining, abi: MINING_ABI, client: wal })
      const h  = await mc.write.claim([BigInt(tokenId)])
      await pub.waitForTransactionReceipt({ hash: h })
      toast.ok('领取成功', '资源已发送到您的钱包')
      fetchChain()
    } catch (e) { toast.err('操作失败', e.message?.slice(0, 80)) }
    finally { setTx('') }
  }

  const hasPending = chainData?.pending?.some(v => v > 0.0001)

  return (
    <div className="lp">
      {/* ── 返回栏 ── */}
      <div className="lp-topbar">
        <button className="lp-back" onClick={onClose}>← 后退 Back</button>
        <span className="tag tag-gray" style={{ fontFamily: 'monospace', fontSize: 10 }}>
          #{String(tokenId).padStart(5, '0')}
        </span>
      </div>

      {/* ══ 属性区 ══ */}
      <section className="lp-sec">
        <div className="lp-sec-hd">
          <span className="lp-sec-zh">属性</span>
          <span className="lp-sec-en">Attributes</span>
          <span className="lp-help">ⓘ</span>
        </div>

        <div className="lp-attr-grid">
          <div className="lp-attr">
            <div className="lp-attr-lbl">类型 Type</div>
            <div className="lp-attr-val" style={{ color: mainColor }}>
              {TYPE_ZH[attr.mainType]}
            </div>
          </div>
          <div className="lp-attr">
            <div className="lp-attr-lbl">坐标 Coord</div>
            <div className="lp-attr-val" style={{ fontFamily: 'monospace' }}>{x}, {y}</div>
          </div>
          <div className="lp-attr">
            <div className="lp-attr-lbl">大陆 Continent</div>
            <div className="lp-attr-val" style={{ fontSize: 11 }}>{CONTINENT}</div>
          </div>
        </div>

        {/* 所有者 */}
        <div className="lp-owner">
          <span className="lp-owner-lbl">所有者 Owner</span>
          {loading ? (
            <span style={{ color: '#2d3748', fontSize: 11 }}>加载中...</span>
          ) : chainData?.owner ? (
            isMine
              ? <span className="lp-mine">🙋 我的地块 My Land</span>
              : <span className="lp-addr">{chainData.owner}</span>
          ) : (
            <span className="lp-unminted">⬡ 尚未铸造（预览）Unminted</span>
          )}
        </div>
      </section>

      {/* ══ 信息区 ══ */}
      <section className="lp-sec">
        <div className="lp-sec-hd">
          <span className="lp-sec-zh">信息</span>
          <span className="lp-sec-en">Info</span>
        </div>
        <div className="lp-info-row">
          <div>
            <div className="lp-info-lbl">介绍 Description</div>
            <div className="lp-info-empty">空空如也 Empty</div>
          </div>
          <div>
            <div className="lp-info-lbl">链接 Link</div>
            <div className="lp-info-empty">空空如也 Empty</div>
          </div>
        </div>
      </section>

      {/* ══ 元素区 ══ */}
      <section className="lp-sec lp-sec-res">
        <div className="lp-sec-hd">
          <span className="lp-sec-zh">元素</span>
          <span className="lp-sec-en">Resources</span>
          <span className="lp-help">ⓘ</span>
        </div>

        {/* 5个圆形图标 + 数值（精确还原原版布局） */}
        <div className="lp-res-row">
          {RES_NAMES_EN.map((name, i) => {
            const val = rates[i] || 0
            const isTop = val === maxVal && val > 0
            return (
              <div key={i} className={`lp-res-item ${isTop ? 'top' : ''}`}>
                <div
                  className="lp-res-circle"
                  style={{
                    background: `${RES_COLORS[i]}1a`,
                    border: `2px solid ${isTop ? RES_COLORS[i] : RES_COLORS[i] + '55'}`,
                    boxShadow: isTop ? `0 0 10px ${RES_COLORS[i]}33` : 'none',
                  }}
                >
                  <span style={{ fontSize: 17 }}>{RES_EMOJIS[i]}</span>
                </div>
                <div className="lp-res-name" style={{ color: RES_COLORS[i] }}>
                  {name.toUpperCase()}
                </div>
                <div className="lp-res-val">{val}</div>
                <div className="lp-res-zh">{RES_NAMES_ZH[i]}</div>
              </div>
            )
          })}
        </div>

        {/* 进度条 */}
        <div className="lp-bars">
          {rates.map((val, i) => (
            <div key={i} className="lp-bar-row">
              <div className="lp-bar-label">
                <span>{RES_NAMES_ZH[i]}</span>
                <span style={{ color: RES_COLORS[i], fontWeight: 700, fontFamily: 'Rajdhani, monospace' }}>{val}</span>
              </div>
              <div className="lp-bar-bg">
                <div
                  className="lp-bar-fill"
                  style={{
                    width:      `${Math.min(100, (val / 255) * 100)}%`,
                    background: RES_COLORS[i],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ 挖矿状态 ══ */}
      <section className="lp-sec">
        <div className="lp-sec-hd">
          <span className="lp-sec-zh">挖矿状态</span>
          <span className="lp-sec-en">Mining Status</span>
          {chainData?.slots?.length > 0 && (
            <span className="tag tag-green" style={{ marginLeft: 'auto', fontSize: 10 }}>
              {chainData.slots.length}/5 插槽
            </span>
          )}
        </div>

        {!isDeployed('mining') ? (
          <div className="lp-tip">⚠ 合约未部署 Contract not deployed</div>
        ) : loading ? (
          <div className="lp-tip">加载中... Loading</div>
        ) : !chainData ? (
          <div className="lp-tip">连接钱包后可查看挖矿信息</div>
        ) : chainData.slots.length === 0 ? (
          <div className="lp-mining-empty">
            <span style={{ fontSize: 28, opacity: 0.2 }}>⛏</span>
            <span>暂无使徒在此挖矿</span>
            <em>No apostles mining here</em>
          </div>
        ) : (
          <div className="lp-slots">
            {chainData.slots.map((s, i) => (
              <div key={i} className="lp-slot">
                <div className="lp-slot-avatar">🧙</div>
                <div className="lp-slot-info">
                  <div className="lp-slot-title">
                    使徒 #{s.apo}
                    <em>Apostle</em>
                  </div>
                  {s.drill > 0 && (
                    <div className="lp-slot-drill">⛏ 钻头 #{s.drill} Drill</div>
                  )}
                  <div className="lp-slot-time">
                    开始 Start: {new Date(s.t * 1000).toLocaleString('zh-CN')}
                  </div>
                </div>
                {isMine && (
                  <button className="btn btn-danger btn-xs" disabled={!!tx}>撤回</button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 待领取奖励 */}
        {hasPending && (
          <div className="lp-pending">
            <div className="lp-pending-hd">待领取 Pending Rewards</div>
            <div className="lp-pending-grid">
              {chainData.pending.map((v, i) => v > 0.0001 && (
                <div key={i} className="lp-pending-item">
                  <span style={{ fontSize: 18 }}>{RES_EMOJIS[i]}</span>
                  <span style={{ color: RES_COLORS[i], fontWeight: 700, fontSize: 13 }}>{v.toFixed(4)}</span>
                  <span style={{ color: '#334155', fontSize: 10 }}>{RES_NAMES_ZH[i]}</span>
                </div>
              ))}
            </div>
            {isMine && (
              <button className="btn btn-primary btn-sm" onClick={doClaim} disabled={!!tx}>
                {tx === 'claim' ? <span className="spin-anim">◌</span> : null}
                一键领取 Claim All
              </button>
            )}
          </div>
        )}
      </section>

      {/* ══ 操作区 ══ */}
      {address && (
        <section className="lp-sec lp-sec-action">
          <div className="lp-sec-hd">
            <span className="lp-sec-zh">操作</span>
            <span className="lp-sec-en">Actions</span>
          </div>

          {!isDepl ? (
            <div className="lp-tip">合约未部署，功能暂不可用</div>
          ) : isMine ? (
            <>
              <div className="lp-action-row">
                <button className="btn btn-sm"
                  onClick={() => setSection(s => s === 'auction' ? 'info' : 'auction')}
                >
                  🏛 {section === 'auction' ? '收起' : '上架拍卖 List Auction'}
                </button>
                <button className="btn btn-sm">⛏ 派遣使徒 Send Apostle</button>
              </div>

              {section === 'auction' && (
                <div className="lp-form-box">
                  <div className="lp-form-title">荷兰拍卖 Dutch Auction</div>
                  <p className="lp-form-desc">价格随时间线性下降，买家随时可以按当前价格购买。</p>
                  {[['起拍价 Start (RING)', 'start'], ['底价 End (RING)', 'end'], ['持续天数 Days', 'days']].map(([l, k]) => (
                    <div key={k} className="form-group" style={{ marginBottom: 8 }}>
                      <label style={{ fontSize: 11, color: '#475569', marginBottom: 4, display: 'block' }}>{l}</label>
                      <input
                        type="number" value={aForm[k]}
                        onChange={e => setAForm(f => ({ ...f, [k]: e.target.value }))}
                      />
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <button className="btn btn-sm" onClick={() => setSection('info')}>取消</button>
                    <button className="btn btn-primary btn-sm" onClick={doCreateAuction} disabled={!!tx}>
                      {tx === 'auction' ? <span className="spin-anim">◌</span> : null} 创建拍卖
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : chainData?.owner ? (
            <button className="btn btn-gold btn-sm">💰 竞拍此地 Bid Now</button>
          ) : (
            <div className="lp-tip" style={{ color: '#4ade80' }}>⬡ 此地块尚未铸造，可在上线后购买</div>
          )}
        </section>
      )}
    </div>
  )
}
