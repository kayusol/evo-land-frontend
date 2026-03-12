import React, { useState, useEffect } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { parseEther, getContract, formatEther } from 'viem'
import {
  CONTRACTS, RES_NAMES_ZH, RES_NAMES_EN,
  RES_EMOJIS, RES_COLORS, LAND_COLORS, isDeployed
} from '../constants/contracts.js'
import { LAND_ABI, AUCTION_ABI, MINING_ABI } from '../constants/abi.js'
import { useToast } from '../contexts/ToastContext.jsx'
import './LandPanel.css'

const TYPE_ZH = ['黄金大陆', '木材森林', '水源绿洲', '火焰熔岩', '土地荒原']
const TYPE_EN = ['Gold', 'Wood', 'Water', 'Fire', 'Soil']
const TYPE_ICONS = ['🥇', '🌲', '💧', '🔥', '⛰']
const CONTINENT_NAME = 'BSC 测试网 (BSC Testnet)'

export default function LandPanel({ land, onClose }) {
  const { address } = useAccount()
  const pub = usePublicClient()
  const { data: wal } = useWalletClient()
  const { toast } = useToast()
  const { x, y, tokenId, attr } = land

  const [tab, setTab] = useState('info')
  const [chainData, setChainData] = useState(null)
  const [loadingChain, setLoadingChain] = useState(false)
  const [auctionForm, setAuctionForm] = useState({ start: '10', end: '1', days: '7' })
  const [tx, setTx] = useState('')

  const mainColor = LAND_COLORS[attr.mainType]
  const isDepl = isDeployed('land')

  // 从链上加载数据
  useEffect(() => {
    if (!pub || !isDepl) return
    setLoadingChain(true)
    ;(async () => {
      try {
        const lc = getContract({ address: CONTRACTS.land, abi: LAND_ABI, client: pub })
        const owner = await lc.read.ownerOf([BigInt(tokenId)])
        const raw = await lc.read.resourceAttr([BigInt(tokenId)])
        const n = BigInt(raw)
        const rates = Array.from({ length: 5 }, (_, i) => Number((n >> BigInt(i * 16)) & 0xFFFFn))
        let slots = [], pending = []
        if (isDeployed('mining')) {
          const mc = getContract({ address: CONTRACTS.mining, abi: MINING_ABI, client: pub })
          const cnt = Number(await mc.read.slotCount([BigInt(tokenId)]))
          const sd = await Promise.all(Array.from({ length: cnt }, (_, i) => mc.read.slots([BigInt(tokenId), BigInt(i)])))
          slots = sd.map(s => ({ apo: Number(s.apostleId), drill: Number(s.drillId), t: Number(s.startTime) }))
          const rw = await mc.read.pendingRewards([BigInt(tokenId)])
          pending = rw.map(r => parseFloat(formatEther(r)))
        }
        setChainData({ owner, rates, slots, pending })
      } catch {}
      finally { setLoadingChain(false) }
    })()
  }, [tokenId, pub, isDepl])

  const isMine = address && chainData?.owner?.toLowerCase() === address?.toLowerCase()
  const displayRates = chainData?.rates ?? attr.rates
  const maxRate = Math.max(...displayRates)

  const createAuction = async () => {
    if (!wal) return
    setTx('auction')
    try {
      const lc = getContract({ address: CONTRACTS.land, abi: LAND_ABI, client: wal })
      const ac = getContract({ address: CONTRACTS.auction, abi: AUCTION_ABI, client: wal })
      const approved = await pub.readContract({ address: CONTRACTS.land, abi: LAND_ABI, functionName: 'getApproved', args: [BigInt(tokenId)] })
      if (approved.toLowerCase() !== CONTRACTS.auction.toLowerCase()) {
        const h = await lc.write.approve([CONTRACTS.auction, BigInt(tokenId)])
        await pub.waitForTransactionReceipt({ hash: h })
      }
      const h = await ac.write.createAuction([
        BigInt(tokenId), parseEther(auctionForm.start),
        parseEther(auctionForm.end), BigInt(Number(auctionForm.days) * 86400)
      ])
      await pub.waitForTransactionReceipt({ hash: h })
      toast.ok('拍卖创建成功', `地块 #${tokenId} 已上架`)
    } catch (e) { toast.err('操作失败', e.message?.slice(0, 80)) }
    finally { setTx('') }
  }

  const claimRewards = async () => {
    if (!wal) return
    setTx('claim')
    try {
      const mc = getContract({ address: CONTRACTS.mining, abi: MINING_ABI, client: wal })
      const h = await mc.write.claim([BigInt(tokenId)])
      await pub.waitForTransactionReceipt({ hash: h })
      toast.ok('领取成功', '资源已发送到您的钱包')
    } catch (e) { toast.err('操作失败', e.message?.slice(0, 80)) }
    finally { setTx('') }
  }

  return (
    <div className="lp-root">
      {/* 顶部返回栏 */}
      <div className="lp-topbar">
        <button className="lp-back-btn" onClick={onClose}>
          <span className="lp-back-arrow">←</span>
          <span>后退 Back</span>
        </button>
      </div>

      {/* ===== 属性区 ===== */}
      <div className="lp-section lp-section-attr">
        <div className="lp-section-hd">
          <span className="lp-section-title">属性</span>
          <span className="lp-section-title-en">Attributes</span>
          <span className="lp-help">ⓘ</span>
        </div>
        <div className="lp-attr-grid">
          <div className="lp-attr-item">
            <div className="lp-attr-label">类型 Type</div>
            <div className="lp-attr-val">{TYPE_ZH[attr.mainType]}</div>
          </div>
          <div className="lp-attr-item">
            <div className="lp-attr-label">坐标 Coord</div>
            <div className="lp-attr-val" style={{fontFamily:'monospace'}}>{x}, {y}</div>
          </div>
          <div className="lp-attr-item">
            <div className="lp-attr-label">大陆 Continent</div>
            <div className="lp-attr-val">{CONTINENT_NAME}</div>
          </div>
        </div>
        <div className="lp-owner-row">
          <span className="lp-owner-label">所有者 Owner</span>
          <span className="lp-owner-val">
            {loadingChain ? (
              <span style={{color:'#4a5568'}}>加载中...</span>
            ) : chainData?.owner ? (
              isMine
                ? <span className="lp-mine-badge">🙋 我的地块 My Land</span>
                : <span className="lp-addr">{chainData.owner}</span>
            ) : (
              <span className="lp-unminted">⬡ 尚未铸造（预览）Unminted</span>
            )}
          </span>
        </div>
      </div>

      {/* ===== 信息区 ===== */}
      <div className="lp-section">
        <div className="lp-section-hd">
          <span className="lp-section-title">信息</span>
          <span className="lp-section-title-en">Info</span>
        </div>
        <div className="lp-info-row">
          <div className="lp-info-col">
            <div className="lp-info-label">介绍 Description</div>
            <div className="lp-info-empty">空空如也 Empty</div>
          </div>
          <div className="lp-info-col">
            <div className="lp-info-label">链接 Link</div>
            <div className="lp-info-empty">空空如也 Empty</div>
          </div>
        </div>
      </div>

      {/* ===== 元素区 ===== */}
      <div className="lp-section lp-section-resources">
        <div className="lp-section-hd">
          <span className="lp-section-title">元素</span>
          <span className="lp-section-title-en">Resources</span>
          <span className="lp-help">ⓘ</span>
        </div>
        <div className="lp-res-grid">
          {RES_NAMES_EN.map((name, i) => {
            const rate = displayRates[i] || 0
            const isTop = rate === maxRate && maxRate > 0
            return (
              <div key={i} className={`lp-res-item${isTop ? ' lp-res-top' : ''}`}>
                {/* 圆形图标 */}
                <div className="lp-res-circle" style={{ background: `${RES_COLORS[i]}22`, border: `2px solid ${RES_COLORS[i]}` }}>
                  <span style={{ fontSize: 16 }}>{RES_EMOJIS[i]}</span>
                </div>
                {/* 名称 */}
                <div className="lp-res-name-en" style={{ color: RES_COLORS[i] }}>{name.toUpperCase()}</div>
                {/* 数值 */}
                <div className="lp-res-val" style={{ color: '#e2e8f0' }}>{rate}</div>
                {/* 中文 */}
                <div className="lp-res-name-zh">{RES_NAMES_ZH[i]}</div>
              </div>
            )
          })}
        </div>

        {/* 进度条 */}
        <div className="lp-res-bars">
          {displayRates.map((rate, i) => (
            <div key={i} className="lp-res-bar-row">
              <div className="lp-res-bar-label">
                <span>{RES_NAMES_ZH[i]}</span>
                <span style={{ color: RES_COLORS[i], fontWeight: 700 }}>{rate}</span>
              </div>
              <div className="lp-res-bar-bg">
                <div
                  className="lp-res-bar-fill"
                  style={{ width: `${Math.min(100, (rate / 255) * 100)}%`, background: RES_COLORS[i] }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== 使徒 & 钻头区 ===== */}
      <div className="lp-section">
        <div className="lp-section-hd">
          <span className="lp-section-title">挖矿状态</span>
          <span className="lp-section-title-en">Mining Status</span>
        </div>
        {!isDeployed('mining') ? (
          <div className="lp-not-deployed">⚠ 合约未部署 Contract not deployed</div>
        ) : loadingChain ? (
          <div className="lp-loading">加载中... Loading</div>
        ) : chainData?.slots?.length === 0 ? (
          <div className="lp-mining-empty">
            <span style={{fontSize:28,opacity:0.3}}>⛏</span>
            <span>暂无使徒在此挖矿</span>
            <span style={{color:'#4a5568',fontSize:11}}>No apostles mining here</span>
          </div>
        ) : (
          <div className="lp-slots">
            {chainData?.slots?.map((s, i) => (
              <div key={i} className="lp-slot-card">
                <div className="lp-slot-avatar">🧙</div>
                <div className="lp-slot-info">
                  <div className="lp-slot-title">使徒 #{s.apo} <span style={{color:'#4a5568',fontSize:10}}>Apostle</span></div>
                  {s.drill > 0 && (
                    <div className="lp-slot-drill">⛏ 钻头 #{s.drill} Drill</div>
                  )}
                  <div className="lp-slot-time">
                    开始时间 Start: {new Date(s.t * 1000).toLocaleString('zh-CN')}
                  </div>
                </div>
                {isMine && (
                  <div className="lp-slot-actions">
                    <button className="btn btn-danger btn-sm" style={{fontSize:10}}>撤回</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 待领取奖励 */}
        {chainData?.pending?.some(v => v > 0) && (
          <div className="lp-pending">
            <div className="lp-pending-title">待领取 Pending Rewards</div>
            <div className="lp-pending-grid">
              {chainData.pending.map((v, i) => v > 0 && (
                <div key={i} className="lp-pending-item">
                  <span>{RES_EMOJIS[i]}</span>
                  <span style={{ color: RES_COLORS[i], fontWeight: 700 }}>{v.toFixed(4)}</span>
                  <span style={{ color: '#4a5568', fontSize: 10 }}>{RES_NAMES_ZH[i]}</span>
                </div>
              ))}
            </div>
            {isMine && (
              <button className="btn btn-primary btn-sm" onClick={claimRewards} disabled={!!tx}>
                {tx === 'claim' ? <span className="spin-anim">◌</span> : null} 一键领取 Claim
              </button>
            )}
          </div>
        )}
      </div>

      {/* ===== 操作区 ===== */}
      {address && (
        <div className="lp-section lp-section-actions">
          <div className="lp-section-hd">
            <span className="lp-section-title">操作</span>
            <span className="lp-section-title-en">Actions</span>
          </div>
          <div className="lp-action-btns">
            {isMine ? (
              <>
                <button className="btn btn-sm" onClick={() => setTab('auction')}>🏛 上架拍卖</button>
                <button className="btn btn-sm" onClick={() => setTab('mine')}>⛏ 派遣使徒</button>
              </>
            ) : chainData?.owner ? (
              <button className="btn btn-gold btn-sm">💰 竞拍此地 Bid</button>
            ) : null}
          </div>

          {/* 上架表单 */}
          {isMine && tab === 'auction' && (
            <div className="lp-auction-form">
              <div className="lp-form-title">荷兰拍卖 Dutch Auction</div>
              {[['起拍价 (RING)', 'start'], ['底价 (RING)', 'end'], ['持续天数', 'days']].map(([l, k]) => (
                <div key={k} className="form-group" style={{marginBottom:8}}>
                  <label style={{fontSize:11,color:'#64748b',marginBottom:3,display:'block'}}>{l}</label>
                  <input type="number" value={auctionForm[k]} onChange={e => setAuctionForm(f => ({ ...f, [k]: e.target.value }))} />
                </div>
              ))}
              <div style={{display:'flex',gap:8,marginTop:4}}>
                <button className="btn btn-sm" onClick={() => setTab('info')}>取消</button>
                <button className="btn btn-primary btn-sm" onClick={createAuction} disabled={!!tx}>
                  {tx === 'auction' ? <span className="spin-anim">◌</span> : null} 创建拍卖
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
