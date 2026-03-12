import React, { useState, useEffect } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { parseEther, getContract } from 'viem'
import { CONTRACTS, RES_NAMES_ZH, RES_NAMES_EN, RES_EMOJIS, RES_COLORS, LAND_COLORS, isDeployed } from '../constants/contracts.js'
import { LAND_ABI, AUCTION_ABI, MINING_ABI } from '../constants/abi.js'
import { useToast } from '../contexts/ToastContext.jsx'
import './LandPanel.css'

const ELEMENT_NAMES = ['黄金大陆', '木材森林', '水源绿洲', '火焰熔岩', '土地荒原']
const TYPE_NAMES_EN = ['Gold', 'Wood', 'Water', 'Fire', 'Soil']

export default function LandPanel({ land, onClose, myLandIds }) {
  const { address } = useAccount()
  const pub = usePublicClient()
  const { data: wal } = useWalletClient()
  const { toast } = useToast()

  const [chainData, setChainData] = useState(null) // { owner, rates, slots, pending }
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('info') // info | mining | auction
  const [auctionForm, setAuctionForm] = useState({ start:'10', end:'1', days:'7' })
  const [mineModal, setMineModal] = useState(false)
  const [tx, setTx] = useState('')

  const { x, y, tokenId, attr } = land
  const mainColor = LAND_COLORS[attr.mainType]
  const isDepl = isDeployed('land')
  const isMine = address && chainData?.owner?.toLowerCase() === address?.toLowerCase()

  // 从链上读取地块详情
  useEffect(() => {
    if (!pub || !isDepl) return
    setLoading(true)
    ;(async () => {
      try {
        const lc = getContract({ address: CONTRACTS.land, abi: LAND_ABI, client: pub })
        const owner = await lc.read.ownerOf([BigInt(tokenId)])
        const attr80 = await lc.read.resourceAttr([BigInt(tokenId)])
        const n = BigInt(attr80)
        const rates = Array.from({ length: 5 }, (_, i) => Number((n >> BigInt(i * 16)) & 0xFFFFn))

        let slots = [], pending = []
        if (isDeployed('mining')) {
          const mc = getContract({ address: CONTRACTS.mining, abi: MINING_ABI, client: pub })
          const cnt = Number(await mc.read.slotCount([BigInt(tokenId)]))
          slots = await Promise.all(Array.from({ length: cnt }, (_, i) => mc.read.slots([BigInt(tokenId), BigInt(i)])))
          const rw = await mc.read.pendingRewards([BigInt(tokenId)])
          pending = rw.map(r => parseFloat(formatEther(r)))
        }
        setChainData({ owner, rates, slots, pending })
      } catch (e) { /* not minted yet or RPC error */ }
      finally { setLoading(false) }
    })()
  }, [tokenId, pub, isDepl])

  // 使用本地生成的资源比率（无链数据时展示）
  const displayRates = chainData?.rates || attr.rates

  const createAuction = async () => {
    if (!wal) return
    setTx('auction')
    try {
      const lc = getContract({ address: CONTRACTS.land, abi: LAND_ABI, client: wal })
      const ac = getContract({ address: CONTRACTS.auction, abi: AUCTION_ABI, client: wal })
      const approved = await pub.readContract({ address: CONTRACTS.land, abi: LAND_ABI, functionName: 'getApproved', args: [BigInt(tokenId)] })
      if (approved.toLowerCase() !== CONTRACTS.auction.toLowerCase()) {
        const h = await lc.write.approve([CONTRACTS.auction, BigInt(tokenId)]); await pub.waitForTransactionReceipt({ hash: h })
      }
      const h = await ac.write.createAuction([BigInt(tokenId), parseEther(auctionForm.start), parseEther(auctionForm.end), BigInt(Number(auctionForm.days) * 86400)])
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
    <div className="land-panel slide-right">
      {/* 面板头部 */}
      <div className="lp-header" style={{ borderBottom: `2px solid ${mainColor}` }}>
        <div className="lp-header-top">
          <button className="lp-back" onClick={onClose}>← 返回</button>
          <span className="tag tag-green" style={{ fontSize:10 }}>ID #{String(tokenId).padStart(5,'0')}</span>
        </div>
        <div className="lp-attr-row">
          <div className="lp-attr-block">
            <div className="lp-attr-label">类型 Type</div>
            <div className="lp-attr-val" style={{ color: mainColor }}>{ELEMENT_NAMES[attr.mainType]}</div>
            <div className="lp-attr-sub">{TYPE_NAMES_EN[attr.mainType]} Land</div>
          </div>
          <div className="lp-attr-block">
            <div className="lp-attr-label">坐标 Coord</div>
            <div className="lp-attr-val" style={{ fontFamily:'monospace' }}>({x}, {y})</div>
          </div>
          <div className="lp-attr-block">
            <div className="lp-attr-label">大陆 Continent</div>
            <div className="lp-attr-val">BSC 测试网</div>
            <div className="lp-attr-sub">BSC Testnet</div>
          </div>
        </div>

        {/* 所有者 */}
        <div className="lp-owner">
          <span className="lp-owner-label">所有者 Owner</span>
          {loading ? (
            <span style={{ color:'#475569', fontSize:11 }}>加载中...</span>
          ) : chainData?.owner ? (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span className={`lp-owner-addr ${isMine ? 'mine' : ''}`}>
                {isMine ? '🙋 我的地块' : chainData.owner.slice(0,8) + '...' + chainData.owner.slice(-6)}
              </span>
              {isMine && <span className="tag tag-green" style={{fontSize:10}}>我的</span>}
            </div>
          ) : (
            <span style={{ color:'#4ade80', fontSize:11 }}>⬡ 尚未铸造（预览）</span>
          )}
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="tabs" style={{ padding:'0 14px', margin:0, borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
        {[['info','地块信息'],['mining','挖矿状态'],['auction','上架拍卖']].map(([id,zh]) => (
          <button key={id} className={`tab-btn${tab===id?' active':''}`} onClick={() => setTab(id)}>
            {zh}
          </button>
        ))}
      </div>

      <div className="lp-body">
        {/* 地块信息 Tab */}
        {tab === 'info' && (
          <div className="lp-section">
            <div className="lp-section-title">元素资源 Resources</div>
            <div className="lp-resources">
              {displayRates.map((rate, i) => (
                <div key={i} className="lp-resource-row">
                  <div className="lp-res-left">
                    <span className="lp-res-emoji">{RES_EMOJIS[i]}</span>
                    <div>
                      <div className="lp-res-name">{RES_NAMES_ZH[i]}</div>
                      <div className="lp-res-name-en">{RES_NAMES_EN[i]}</div>
                    </div>
                  </div>
                  <div className="lp-res-bar-wrap">
                    <div className="lp-res-bar">
                      <div
                        className="lp-res-fill"
                        style={{ width: `${Math.min(100,(rate/255)*100)}%`, background: RES_COLORS[i] }}
                      />
                    </div>
                    <span className="lp-res-val" style={{ color: RES_COLORS[i] }}>{rate}</span>
                  </div>
                </div>
              ))}
            </div>

            {!isDepl && (
              <div className="lp-notice">
                <span style={{ color:'#fbbf24' }}>⚠</span>
                当前显示预览数据，部署合约后显示真实链上数据
              </div>
            )}

            <div className="divider" />
            <div className="lp-section-title">地块操作 Actions</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {isMine && (
                <>
                  <button className="btn btn-primary btn-sm" onClick={() => setTab('auction')}>🏛 上架拍卖</button>
                  <button className="btn btn-sm" onClick={() => setTab('mining')}>⛏ 挖矿管理</button>
                </>
              )}
              {!isMine && chainData?.owner && (
                <button className="btn btn-gold btn-sm" onClick={() => setTab('auction')}>💰 竞拍此地</button>
              )}
            </div>
          </div>
        )}

        {/* 挖矿状态 Tab */}
        {tab === 'mining' && (
          <div className="lp-section">
            {!isDeployed('mining') ? (
              <div className="lp-notice"><span style={{color:'#fbbf24'}}>⚠</span> 合约未部署，填写地址后可用</div>
            ) : (
              <>
                <div className="lp-section-title">待领取资源 Pending Rewards</div>
                {chainData?.pending ? (
                  <div className="lp-pending-grid">
                    {chainData.pending.map((v, i) => (
                      <div key={i} className="lp-pending-item">
                        <span style={{ fontSize:20 }}>{RES_EMOJIS[i]}</span>
                        <div>
                          <div style={{ fontSize:13, fontWeight:700, color: RES_COLORS[i] }}>{v.toFixed(4)}</div>
                          <div style={{ fontSize:10, color:'#475569' }}>{RES_NAMES_ZH[i]}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <div className="lp-notice">加载中...</div>}

                {chainData?.pending?.some(v => v > 0) && (
                  <button className="btn btn-primary btn-sm" onClick={claimRewards} disabled={!!tx}>
                    {tx === 'claim' ? <span className="spin-anim">◌</span> : null} 一键领取
                  </button>
                )}

                <div className="divider" />
                <div className="lp-section-title">挖矿位 Mining Slots ({chainData?.slots?.length || 0}/5)</div>
                {chainData?.slots?.length === 0 && (
                  <p style={{ fontSize:12, color:'#475569' }}>当前没有使徒在此地块挖矿</p>
                )}
                {chainData?.slots?.map((s, i) => (
                  <div key={i} className="lp-slot-row">
                    <span style={{ fontSize:18 }}>🧙</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:'#f1f5f9' }}>使徒 #{Number(s.apostleId)}</div>
                      {Number(s.drillId) > 0 && (
                        <div style={{ fontSize:11, color:'#94a3b8' }}>⛏ 钻头 #{Number(s.drillId)}</div>
                      )}
                      <div style={{ fontSize:10, color:'#475569' }}>开始: {new Date(Number(s.startTime)*1000).toLocaleString('zh-CN')}</div>
                    </div>
                    {isMine && (
                      <button className="btn btn-danger btn-sm"
                        style={{ fontSize:10, padding:'3px 8px' }}
                        disabled={!!tx}
                      >撤回</button>
                    )}
                  </div>
                ))}

                {isMine && (chainData?.slots?.length || 0) < 5 && (
                  <button className="btn btn-primary btn-sm" onClick={() => setMineModal(true)}>+ 派遣使徒</button>
                )}
              </>
            )}
          </div>
        )}

        {/* 上架拍卖 Tab */}
        {tab === 'auction' && (
          <div className="lp-section">
            {!isDeployed('auction') ? (
              <div className="lp-notice"><span style={{color:'#fbbf24'}}>⚠</span> 合约未部署，填写地址后可用</div>
            ) : !address ? (
              <div className="lp-notice">请先连接钱包</div>
            ) : !isMine ? (
              <div className="lp-notice">此地块不属于您，无法上架</div>
            ) : (
              <>
                <div className="lp-section-title">荷兰拍卖 Dutch Auction</div>
                <p style={{ fontSize:12, color:'#64748b', marginBottom:14 }}>价格将在拍卖期间从起拍价线性降至底价，买家随时可按当前价格购买。</p>
                {[['起拍价 (RING)','start'],['底价 (RING)','end'],['持续天数','days']].map(([l,k]) => (
                  <div key={k} className="form-group">
                    <label>{l}</label>
                    <input type="number" value={auctionForm[k]} onChange={e => setAuctionForm(f => ({...f,[k]:e.target.value}))} />
                  </div>
                ))}
                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn btn-primary" onClick={createAuction} disabled={!!tx}>
                    {tx==='auction' ? <span className="spin-anim">◌</span> : null} 创建拍卖
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
