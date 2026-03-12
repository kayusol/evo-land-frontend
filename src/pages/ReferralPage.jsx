import React, { useState, useEffect } from 'react'
import { useAccount, usePublicClient, useWalletClient, useReadContract } from 'wagmi'
import { formatEther, getContract, isAddress } from 'viem'
import { CONTRACTS, RES_NAMES_EN, RES_EMOJIS, RES_COLORS, RES_KEYS, isDeployed } from '../constants/contracts.js'
import { ERC20_ABI } from '../constants/abi.js'
import { useToast } from '../contexts/ToastContext.jsx'
import './ReferralPage.css'

const ZERO = '0x0000000000000000000000000000000000000000'

const REFERRAL_ABI = [
  {
    name: 'bind',
    type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: '_referrer', type: 'address' }],
    outputs: [],
  },
  {
    name: 'bound',
    type: 'function', stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'referrer',
    type: 'function', stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'getAncestors',
    type: 'function', stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: 'ancestors', type: 'address[5]' }],
  },
  {
    name: 'earned',
    type: 'function', stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }, { name: 'token', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getRates',
    type: 'function', stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256[5]' }],
  },
  {
    name: 'ReferralRewarded',
    type: 'event',
    inputs: [
      { name: 'earner',  type: 'address', indexed: true },
      { name: 'miner',   type: 'address', indexed: true },
      { name: 'token',   type: 'address', indexed: true },
      { name: 'amount',  type: 'uint256' },
      { name: 'level',   type: 'uint8' },
    ],
  },
]

// 展示地址
function Addr({ addr }) {
  if (!addr || addr === ZERO) return <span style={{ color: '#334155' }}>未绑定</span>
  return (
    <a
      href={`https://testnet.bscscan.com/address/${addr}`}
      target="_blank" rel="noreferrer"
      className="ref-addr-link"
      title={addr}
    >
      {addr.slice(0, 6)}...{addr.slice(-4)}
    </a>
  )
}

// 展示收益行
function EarnedRow({ addr }) {
  const pub = usePublicClient()
  const dep  = isDeployed('referral')
  const [vals, setVals] = useState(Array(5).fill(0n))

  useEffect(() => {
    if (!addr || addr === ZERO || !pub || !dep) return
    const load = async () => {
      const rc = getContract({ address: CONTRACTS.referral, abi: REFERRAL_ABI, client: pub })
      const arr = await Promise.all(
        RES_KEYS.map(k => rc.read.earned([addr, CONTRACTS[k] ?? ZERO]).catch(() => 0n))
      )
      setVals(arr)
    }
    load()
  }, [addr, pub, dep])

  return (
    <div className="ref-earned-row">
      {RES_KEYS.map((k, i) => (
        <span key={k} className="ref-earned-item" style={{ color: RES_COLORS[i] }}>
          {RES_EMOJIS[i]} {parseFloat(formatEther(vals[i])).toFixed(3)}
        </span>
      ))}
    </div>
  )
}

export default function ReferralPage() {
  const { address } = useAccount()
  const pub  = usePublicClient()
  const { data: wc } = useWalletClient()
  const { toast }    = useToast()

  const dep = isDeployed('referral')

  const [tab,      setTab]      = useState('overview') // overview | invite | history
  const [refInput, setRefInput] = useState('')          // 要绑定的上级
  const [loading,  setLoading]  = useState(false)
  const [ancestors, setAncestors] = useState(Array(5).fill(ZERO))
  const [rates,    setRates]    = useState([500, 300, 200, 100, 50])
  const [history,  setHistory]  = useState([])
  const [histLoad, setHistLoad] = useState(false)

  // 是否已绑定
  const { data: isBound, refetch: refetchBound } = useReadContract({
    address: CONTRACTS.referral, abi: REFERRAL_ABI, functionName: 'bound',
    args: [address],
    query: { enabled: !!address && dep },
  })

  // 直接上级
  const { data: myReferrer } = useReadContract({
    address: CONTRACTS.referral, abi: REFERRAL_ABI, functionName: 'referrer',
    args: [address],
    query: { enabled: !!address && dep },
  })

  // 加载祖先链 + 比例
  useEffect(() => {
    if (!address || !pub || !dep) return
    const load = async () => {
      const rc = getContract({ address: CONTRACTS.referral, abi: REFERRAL_ABI, client: pub })
      const [anc, r] = await Promise.all([
        rc.read.getAncestors([address]).catch(() => Array(5).fill(ZERO)),
        rc.read.getRates().catch(() => [500n,300n,200n,100n,50n]),
      ])
      setAncestors(anc)
      setRates(r.map(Number))
    }
    load()
  }, [address, pub, dep, isBound])

  // 加载历史收益
  useEffect(() => {
    if (tab !== 'history' || !address || !pub || !dep) return
    setHistLoad(true)
    const load = async () => {
      try {
        const f = await pub.createContractEventFilter({
          address: CONTRACTS.referral, abi: REFERRAL_ABI,
          eventName: 'ReferralRewarded',
          args: { earner: address },
          fromBlock: 0n,
        })
        const logs = await pub.getFilterLogs({ filter: f })
        setHistory(logs.map(l => ({
          miner:  l.args.miner,
          token:  l.args.token,
          amount: l.args.amount,
          level:  l.args.level,
          txHash: l.transactionHash,
          block:  Number(l.blockNumber),
        })).reverse())
      } catch {}
      setHistLoad(false)
    }
    load()
  }, [tab, address, pub, dep])

  // 绑定上级
  const handleBind = async () => {
    if (!wc || !refInput || !isAddress(refInput)) {
      toast('err', '请输入有效的邀请人地址'); return
    }
    setLoading(true)
    try {
      const hash = await wc.writeContract({
        address: CONTRACTS.referral, abi: REFERRAL_ABI,
        functionName: 'bind', args: [refInput],
      })
      await pub.waitForTransactionReceipt({ hash })
      await refetchBound()
      toast('ok', '绑定成功！')
      setRefInput('')
    } catch (e) {
      toast('err', e.shortMessage ?? e.message)
    }
    setLoading(false)
  }

  // 复制邀请链接
  const copyInvite = () => {
    if (!address) return
    const link = `${window.location.origin}?ref=${address}`
    navigator.clipboard.writeText(link).then(() => toast('ok', '邀请链接已复制！'))
  }

  // 展示用 — 未连接
  if (!address) return (
    <div className="nc-state">
      <div className="nc-icon">🤝</div>
      <h3>请先连接錢包</h3>
      <p>Connect wallet to view referral info</p>
    </div>
  )

  const LEVEL_LABELS = ['L1 直接', 'L2 间接', 'L3 三级', 'L4 四级', 'L5 五级']
  const LEVEL_COLORS = ['#4ade80','#38bdf8','#fbbf24','#f87171','#c084fc']

  return (
    <div className="ref-root">
      {/* 标题区 */}
      <div className="ref-hero">
        <div className="ref-hero-icon">🤝</div>
        <div>
          <div className="ref-hero-title">邀请奖励</div>
          <div className="ref-hero-sub">5 级邀请，下级挖矿自动将元素收益返还给上级</div>
        </div>
        {/* 奖励比例展示 */}
        <div className="ref-rates">
          {LEVEL_LABELS.map((l, i) => (
            <div key={i} className="ref-rate-badge" style={{ borderColor: LEVEL_COLORS[i] + '55', background: LEVEL_COLORS[i] + '11' }}>
              <span style={{ color: LEVEL_COLORS[i], fontWeight: 800, fontSize: 13, fontFamily: 'Rajdhani, monospace' }}>
                {(rates[i] / 100).toFixed(1)}%
              </span>
              <span style={{ fontSize: 10, color: '#475569' }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 子标签 */}
      <div className="ref-tabs">
        {[['overview','概览'],['invite','邀请'],['history','收益记录']].map(([id,l]) => (
          <button key={id} className={`tab-item ${tab===id?'active':''}`} onClick={() => setTab(id)}>{l}</button>
        ))}
      </div>

      <div className="ref-body">

        {/* ========== 概览 ========== */}
        {tab === 'overview' && (
          <div className="ref-overview">
            {/* 绑定卡 */}
            <div className="ref-card">
              <div className="ref-card-title">🔗 我的邀请人</div>
              {isBound ? (
                <div className="ref-bound-row">
                  <span className="ref-badge-green">✓ 已绑定</span>
                  <Addr addr={myReferrer} />
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    className="ref-input"
                    placeholder="输入邀请人地址 0x..."
                    value={refInput}
                    onChange={e => setRefInput(e.target.value)}
                  />
                  <button className="btn btn-primary btn-sm" onClick={handleBind} disabled={loading || !dep}>
                    {loading ? '绑定中...' : dep ? '绑定' : '合約未部署'}
                  </button>
                </div>
              )}
            </div>

            {/* 5级祖先链 */}
            <div className="ref-card">
              <div className="ref-card-title">🔗 我的上级链（5级）</div>
              <div className="ref-chain">
                {/* 自己 */}
                <div className="ref-chain-node ref-chain-self">
                  <div className="ref-node-dot" style={{ background: '#4ade80', boxShadow: '0 0 8px #4ade8088' }} />
                  <div className="ref-node-body">
                    <span className="ref-node-level" style={{ color: '#4ade80' }}>ME</span>
                    <Addr addr={address} />
                  </div>
                </div>
                {LEVEL_LABELS.map((lbl, i) => (
                  <div key={i} className="ref-chain-node">
                    <div className="ref-chain-line" style={{ background: LEVEL_COLORS[i] + '44' }} />
                    <div className="ref-node-dot" style={{ background: LEVEL_COLORS[i], boxShadow: `0 0 6px ${LEVEL_COLORS[i]}66` }} />
                    <div className="ref-node-body">
                      <span className="ref-node-level" style={{ color: LEVEL_COLORS[i] }}>
                        {lbl} <span style={{ fontFamily: 'Rajdhani, monospace', fontWeight: 800 }}>{(rates[i]/100).toFixed(1)}%</span>
                      </span>
                      <Addr addr={ancestors[i]} />
                    </div>
                    <EarnedRow addr={ancestors[i]} />
                  </div>
                ))}
              </div>
            </div>

            {/* 我的历史收益汇总 */}
            <div className="ref-card">
              <div className="ref-card-title">🌾 历史收益汇总（五种元素）</div>
              {dep ? (
                <EarnedRow addr={address} />
              ) : (
                <div className="notice-bar"><span className="notice-icon">⚠</span>合約未部署——部署后可查看</div>
              )}
            </div>
          </div>
        )}

        {/* ========== 邀请 ========== */}
        {tab === 'invite' && (
          <div className="ref-invite-wrap">
            <div className="ref-card ref-invite-card">
              <div style={{ fontSize: 48, textAlign: 'center' }}>🎁</div>
              <div className="ref-card-title" style={{ textAlign: 'center', fontSize: 16 }}>邀请好友，共享奖励</div>
              <p style={{ color: '#475569', fontSize: 12, textAlign: 'center', margin: '4px 0 16px' }}>
                好友通过你的链接绑定并开始挖矿后，<br />
                他们每次挖矿产出的元素会按比例自动返还给你
              </p>

              {/* 邀请链接展示 */}
              <div className="ref-link-box">
                <span className="ref-link-text">{window.location.origin}?ref={address?.slice(0,8)}...{address?.slice(-4)}</span>
                <button className="btn btn-primary btn-sm" onClick={copyInvite}>复制</button>
              </div>

              {/* 二维码占位 */}
              <div className="ref-qr-placeholder">
                <div style={{ fontSize: 40 }}>📱</div>
                <span>扫码分享（开发中）</span>
              </div>

              {/* 奖励说明表 */}
              <div className="ref-table">
                <div className="ref-table-hd">
                  <span>级别</span>
                  <span>关系</span>
                  <span>奖励比例</span>
                  <span>示例 (100 GOLD)</span>
                </div>
                {LEVEL_LABELS.map((lbl, i) => (
                  <div key={i} className="ref-table-row" style={{ borderColor: LEVEL_COLORS[i] + '22' }}>
                    <span className="ref-table-level" style={{ color: LEVEL_COLORS[i] }}>{lbl}</span>
                    <span style={{ fontSize: 11, color: '#475569' }}>
                      {['直接推荐','2级','3级','4级','5级'][i]}
                    </span>
                    <span style={{ fontFamily: 'Rajdhani, monospace', fontWeight: 800, color: LEVEL_COLORS[i] }}>
                      {(rates[i]/100).toFixed(1)}%
                    </span>
                    <span style={{ fontFamily: 'Rajdhani, monospace', color: '#94a3b8' }}>
                      +{(rates[i]/100).toFixed(1)} GOLD
                    </span>
                  </div>
                ))}
                <div className="ref-table-row" style={{ background: 'rgba(74,222,128,0.04)', borderColor: 'rgba(74,222,128,0.15)' }}>
                  <span style={{ color: '#94a3b8', fontSize: 11 }}>合计奖励</span>
                  <span />
                  <span style={{ fontFamily: 'Rajdhani, monospace', fontWeight: 800, color: '#4ade80' }}>
                    {(rates.reduce((s,r)=>s+r,0)/100).toFixed(1)}%
                  </span>
                  <span style={{ fontFamily: 'Rajdhani, monospace', color: '#4ade80' }}>
                    +{(rates.reduce((s,r)=>s+r,0)/100).toFixed(1)} GOLD
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== 收益记录 ========== */}
        {tab === 'history' && (
          <div className="ref-history">
            {!dep ? (
              <div className="notice-bar"><span className="notice-icon">⚠</span>合約未部署</div>
            ) : histLoad ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[...Array(5)].map((_,i) => <div key={i} className="skeleton" style={{ height: 48 }} />)}
              </div>
            ) : history.length === 0 ? (
              <div className="empty-state">
                <div style={{ fontSize: 56, opacity: 0.12 }}>🌾</div>
                <h4>暂无收益记录</h4>
                <p style={{ color: '#334155', fontSize: 12 }}>邀请好友开始挖矿即可产生收益</p>
              </div>
            ) : (
              <>
                <div className="ref-hist-header">
                  <span>层级</span>
                  <span>挖矿地址</span>
                  <span>代币</span>
                  <span>数量</span>
                  <span>块高</span>
                </div>
                {history.map((h, i) => {
                  const tokIdx = Object.values(CONTRACTS).indexOf(h.token)
                  const tokLabel = tokIdx >= 0 ? RES_NAMES_EN[tokIdx] ?? 'TOKEN' : h.token.slice(0,6)
                  const tokEmoji = tokIdx >= 0 ? RES_EMOJIS[tokIdx] : '💰'
                  const tokColor = tokIdx >= 0 ? RES_COLORS[tokIdx] : '#94a3b8'
                  const lv = h.level - 1
                  return (
                    <div key={i} className="ref-hist-row">
                      <span className="ref-hist-lv" style={{ color: LEVEL_COLORS[lv], borderColor: LEVEL_COLORS[lv]+'44' }}>
                        L{h.level}
                      </span>
                      <a href={`https://testnet.bscscan.com/address/${h.miner}`} target="_blank" rel="noreferrer" className="ref-addr-link">
                        {h.miner.slice(0,6)}...{h.miner.slice(-4)}
                      </a>
                      <span style={{ color: tokColor }}>{tokEmoji} {tokLabel}</span>
                      <span style={{ fontFamily: 'Rajdhani, monospace', fontWeight: 700, color: '#4ade80' }}>
                        +{parseFloat(formatEther(h.amount)).toFixed(4)}
                      </span>
                      <a href={`https://testnet.bscscan.com/tx/${h.txHash}`} target="_blank" rel="noreferrer" className="ref-addr-link">
                        #{h.block}
                      </a>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
