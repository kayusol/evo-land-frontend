import React, { useState, useEffect, useCallback } from 'react'
import { useAccount, usePublicClient, useWalletClient, useReadContract } from 'wagmi'
import { formatEther, parseEther, parseUnits, formatUnits, getContract, maxUint256 } from 'viem'
import { CONTRACTS, RES_NAMES_EN, RES_EMOJIS, RES_COLORS, RES_KEYS, isDeployed } from '../constants/contracts.js'
import { ERC20_ABI } from '../constants/abi.js'
import { useToast } from '../contexts/ToastContext.jsx'
import './SwapPage.css'

const ZERO = '0x0000000000000000000000000000000000000000'

// BSC Testnet WBNB / USDT (testnet)
const WBNB_ADDR  = '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd'
const USDT_ADDR  = '0x337610d27c682E347C9cD60BD4b3b107C9d34dEf'
const ROUTER_ADDR = '0xD99D1c33F9fC3444f8101754aBC46c52416550d1' // PancakeSwap BSC Testnet

const ROUTER_ABI = [
  {
    name: 'swapExactTokensForTokens',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
  {
    name: 'swapExactETHForTokens',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
  {
    name: 'swapExactTokensForETH',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
  {
    name: 'getAmountsOut',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'path', type: 'address[]' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
]

// ===== 交易对配置 =====
const PAIRS = [
  {
    id: 'gold',
    label: 'GOLD → RING',
    fromKey: 'gold', fromLabel: 'GOLD', fromEmoji: '🪙', fromColor: '#fbbf24',
    toKey: 'ring',   toLabel: 'RING',  toEmoji: '💎', toColor: '#a78bfa',
    type: 'element',
  },
  {
    id: 'wood',
    label: 'WOOD → RING',
    fromKey: 'wood', fromLabel: 'WOOD', fromEmoji: '🌲', fromColor: '#4ade80',
    toKey: 'ring',   toLabel: 'RING',  toEmoji: '💎', toColor: '#a78bfa',
    type: 'element',
  },
  {
    id: 'water',
    label: 'WATER → RING',
    fromKey: 'water', fromLabel: 'WATER', fromEmoji: '💧', fromColor: '#38bdf8',
    toKey: 'ring',    toLabel: 'RING',   toEmoji: '💎', toColor: '#a78bfa',
    type: 'element',
  },
  {
    id: 'fire',
    label: 'FIRE → RING',
    fromKey: 'fire', fromLabel: 'FIRE', fromEmoji: '🔥', fromColor: '#f87171',
    toKey: 'ring',   toLabel: 'RING',  toEmoji: '💎', toColor: '#a78bfa',
    type: 'element',
  },
  {
    id: 'soil',
    label: 'SOIL → RING',
    fromKey: 'soil', fromLabel: 'SOIL', fromEmoji: '⛰', fromColor: '#a78bfa',
    toKey: 'ring',   toLabel: 'RING',  toEmoji: '💎', toColor: '#a78bfa',
    type: 'element',
  },
  {
    id: 'ring-bnb',
    label: 'RING ↔ BNB',
    fromKey: 'ring', fromLabel: 'RING', fromEmoji: '💎', fromColor: '#a78bfa',
    toKey:  'bnb',   toLabel: 'BNB',   toEmoji: '🟡', toColor: '#fbbf24',
    type: 'external',
    toAddr: WBNB_ADDR,
    isNative: true,
  },
  {
    id: 'ring-usdt',
    label: 'RING ↔ USDT',
    fromKey: 'ring', fromLabel: 'RING', fromEmoji: '💎', fromColor: '#a78bfa',
    toKey:  'usdt',  toLabel: 'USDT',  toEmoji: '💵', toColor: '#4ade80',
    type: 'external',
    toAddr: USDT_ADDR,
  },
]

function getContractAddr(key) {
  if (key === 'bnb' || key === 'usdt') return null
  return CONTRACTS[key] ?? ZERO
}

// ===== 单对 Swap 面板 =====
function SwapCard({ pair }) {
  const { address } = useAccount()
  const pub  = usePublicClient()
  const { data: wc } = useWalletClient()
  const { toast }    = useToast()

  const [fromAmt, setFromAmt] = useState('')
  const [toAmt,   setToAmt]   = useState('')
  const [slippage, setSlippage] = useState('0.5')
  const [reversed, setReversed] = useState(false)  // RING->Element or BNB->RING
  const [loading,  setLoading]  = useState(false)
  const [approved, setApproved] = useState(false)

  // 当前 from/to（支持反转）
  const isRev = reversed
  const cur = isRev
    ? { fromKey: pair.toKey, fromLabel: pair.toLabel, fromEmoji: pair.toEmoji, fromColor: pair.toColor,
        toKey: pair.fromKey, toLabel: pair.fromLabel, toEmoji: pair.fromEmoji, toColor: pair.fromColor }
    : pair

  const fromAddr = getContractAddr(cur.fromKey)
  const toAddr   = getContractAddr(cur.toKey)

  // 读取余额
  const { data: fromBal } = useReadContract({
    address: fromAddr, abi: ERC20_ABI, functionName: 'balanceOf',
    args: [address],
    query: { enabled: !!address && !!fromAddr && fromAddr !== ZERO && cur.fromKey !== 'bnb' },
  })
  const { data: toBal } = useReadContract({
    address: toAddr, abi: ERC20_ABI, functionName: 'balanceOf',
    args: [address],
    query: { enabled: !!address && !!toAddr && toAddr !== ZERO && cur.toKey !== 'bnb' },
  })

  // 读取 Allowance
  const { data: allowance, refetch: refetchAllow } = useReadContract({
    address: fromAddr, abi: ERC20_ABI, functionName: 'allowance',
    args: [address, ROUTER_ADDR],
    query: { enabled: !!address && !!fromAddr && fromAddr !== ZERO && cur.fromKey !== 'bnb' },
  })

  useEffect(() => {
    if (!fromAmt || !allowance) return
    try {
      setApproved(allowance >= parseEther(fromAmt))
    } catch { setApproved(false) }
  }, [allowance, fromAmt])

  // 估算输出
  const estimateOut = useCallback(async (val) => {
    if (!val || !pub || !isDeployed('ring')) { setToAmt(''); return }
    const inAddr  = fromAddr === ZERO ? WBNB_ADDR : fromAddr
    const outAddr = toAddr   === ZERO ? WBNB_ADDR : toAddr
    try {
      const router = getContract({ address: ROUTER_ADDR, abi: ROUTER_ABI, client: pub })
      const path   = [inAddr, CONTRACTS.ring ?? inAddr, outAddr].filter((a, i, arr) => arr.indexOf(a) === i)
      const res    = await router.read.getAmountsOut([parseEther(val), path])
      setToAmt(parseFloat(formatEther(res[res.length - 1])).toFixed(4))
    } catch { setToAmt('?') }
  }, [pub, fromAddr, toAddr])

  const handleFromChange = (v) => {
    setFromAmt(v)
    if (v) estimateOut(v)
    else setToAmt('')
  }

  // Approve
  const handleApprove = async () => {
    if (!wc || !fromAddr) return
    setLoading(true)
    try {
      const hash = await wc.writeContract({
        address: fromAddr, abi: ERC20_ABI, functionName: 'approve',
        args: [ROUTER_ADDR, maxUint256],
      })
      await pub.waitForTransactionReceipt({ hash })
      await refetchAllow()
      toast('ok', 'Approve 成功！')
    } catch (e) {
      toast('err', e.shortMessage ?? e.message)
    }
    setLoading(false)
  }

  // Swap
  const handleSwap = async () => {
    if (!wc || !fromAmt || !address) return
    setLoading(true)
    try {
      const deadline  = BigInt(Math.floor(Date.now() / 1000) + 1200)
      const amtIn     = parseEther(fromAmt)
      const amtOutMin = toAmt && toAmt !== '?' ? parseEther((parseFloat(toAmt) * (1 - parseFloat(slippage) / 100)).toFixed(6)) : 0n
      const router    = getContract({ address: ROUTER_ADDR, abi: ROUTER_ABI, client: wc })
      let hash

      if (cur.fromKey === 'bnb') {
        // BNB → Token
        hash = await wc.writeContract({
          address: ROUTER_ADDR, abi: ROUTER_ABI, functionName: 'swapExactETHForTokens',
          args: [amtOutMin, [WBNB_ADDR, toAddr], address, deadline],
          value: amtIn,
        })
      } else if (cur.toKey === 'bnb') {
        // Token → BNB
        hash = await wc.writeContract({
          address: ROUTER_ADDR, abi: ROUTER_ABI, functionName: 'swapExactTokensForETH',
          args: [amtIn, amtOutMin, [fromAddr, WBNB_ADDR], address, deadline],
        })
      } else {
        // Token → Token
        const path = [fromAddr, CONTRACTS.ring, toAddr].filter((a, i, arr) => arr.indexOf(a) === i)
        hash = await wc.writeContract({
          address: ROUTER_ADDR, abi: ROUTER_ABI, functionName: 'swapExactTokensForTokens',
          args: [amtIn, amtOutMin, path, address, deadline],
        })
      }

      await pub.waitForTransactionReceipt({ hash })
      toast('ok', `Swap 成功！`)
      setFromAmt('')
      setToAmt('')
    } catch (e) {
      toast('err', e.shortMessage ?? e.message)
    }
    setLoading(false)
  }

  const fmtBal = (d) => d ? parseFloat(formatEther(d)).toFixed(4) : '0.0000'
  const canSwap = !!address && !!fromAmt && parseFloat(fromAmt) > 0 && !loading
  const needApprove = canSwap && !approved && cur.fromKey !== 'bnb'

  return (
    <div className="sw-card">
      {/* 标题 */}
      <div className="sw-card-head">
        <span className="sw-card-title">
          <span style={{ fontSize: 20 }}>{cur.fromEmoji}</span>
          {cur.fromLabel}
          <span style={{ color: '#334155', fontSize: 13, margin: '0 4px' }}>→</span>
          <span style={{ fontSize: 20 }}>{cur.toEmoji}</span>
          {cur.toLabel}
        </span>
        {/* 仅 external 对支持反转 */}
        {pair.type === 'external' && (
          <button className="sw-reverse-btn" title="反转方向" onClick={() => { setReversed(r => !r); setFromAmt(''); setToAmt('') }}>
            ⇄
          </button>
        )}
      </div>

      {/* From */}
      <div className="sw-token-box">
        <div className="sw-tok-row">
          <div className="sw-tok-badge" style={{ background: cur.fromColor + '22', borderColor: cur.fromColor + '55', color: cur.fromColor }}>
            {cur.fromEmoji} {cur.fromLabel}
          </div>
          <span className="sw-bal">余额: {fmtBal(fromBal)}</span>
        </div>
        <div className="sw-input-row">
          <input
            type="number" min="0" placeholder="0.00"
            value={fromAmt}
            onChange={e => handleFromChange(e.target.value)}
            className="sw-input"
          />
          <button className="sw-max-btn" onClick={() => handleFromChange(fromBal ? formatEther(fromBal) : '0')}>MAX</button>
        </div>
      </div>

      {/* 箭头 */}
      <div className="sw-arrow">↓</div>

      {/* To */}
      <div className="sw-token-box">
        <div className="sw-tok-row">
          <div className="sw-tok-badge" style={{ background: cur.toColor + '22', borderColor: cur.toColor + '55', color: cur.toColor }}>
            {cur.toEmoji} {cur.toLabel}
          </div>
          <span className="sw-bal">余额: {fmtBal(toBal)}</span>
        </div>
        <div className="sw-input-row">
          <input
            type="number" placeholder="预计获得" readOnly
            value={toAmt}
            className="sw-input sw-input-readonly"
          />
        </div>
      </div>

      {/* 滑点 */}
      <div className="sw-settings">
        <span style={{ color: '#334155', fontSize: 11 }}>滑点容忍度</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {['0.1','0.5','1.0'].map(s => (
            <button key={s} className={`sw-slip-btn ${slippage===s?'active':''}`} onClick={() => setSlippage(s)}>{s}%</button>
          ))}
          <input
            type="number" className="sw-slip-input" placeholder="自定义"
            value={['0.1','0.5','1.0'].includes(slippage) ? '' : slippage}
            onChange={e => setSlippage(e.target.value)}
          />
        </div>
      </div>

      {/* 操作按钮 */}
      {!address ? (
        <button className="btn btn-primary" style={{ width: '100%', marginTop: 10 }} disabled>请先连接钱包</button>
      ) : needApprove ? (
        <button className="btn btn-gold" style={{ width: '100%', marginTop: 10 }} onClick={handleApprove} disabled={loading}>
          {loading ? '处理中...' : `授权 ${cur.fromLabel}`}
        </button>
      ) : (
        <button className="btn btn-primary" style={{ width: '100%', marginTop: 10 }} onClick={handleSwap} disabled={!canSwap || loading}>
          {loading ? '交易中...' : '确认 Swap'}
        </button>
      )}

      {/* 价格提示 */}
      {fromAmt && toAmt && toAmt !== '?' && (
        <div className="sw-rate">
          1 {cur.fromLabel} ≈ {(parseFloat(toAmt) / parseFloat(fromAmt)).toFixed(4)} {cur.toLabel}
        </div>
      )}
    </div>
  )
}

// ===== 主页 =====
export default function SwapPage() {
  const [active, setActive] = useState('gold')
  const pair = PAIRS.find(p => p.id === active)

  return (
    <div className="sw-root">
      {/* 左侧对列表 */}
      <aside className="sw-side">
        <div className="sw-side-title">交易对</div>

        <div className="sw-pair-group">
          <div className="sw-group-label">元素 → RING</div>
          {PAIRS.filter(p => p.type === 'element').map(p => (
            <button
              key={p.id}
              className={`sw-pair-btn ${active===p.id?'active':''}`}
              onClick={() => setActive(p.id)}
            >
              <span style={{ fontSize: 16 }}>{p.fromEmoji}</span>
              <span>{p.fromLabel}</span>
              <span style={{ color: '#334155', fontSize: 11, marginLeft: 'auto' }}>→ 💎</span>
            </button>
          ))}
        </div>

        <div className="sw-pair-group">
          <div className="sw-group-label">RING ↔ 外部</div>
          {PAIRS.filter(p => p.type === 'external').map(p => (
            <button
              key={p.id}
              className={`sw-pair-btn ${active===p.id?'active':''}`}
              onClick={() => setActive(p.id)}
            >
              <span style={{ fontSize: 16 }}>💎</span>
              <span>RING</span>
              <span style={{ color: '#334155', fontSize: 11, marginLeft: 'auto' }}>↔ {p.toEmoji}</span>
            </button>
          ))}
        </div>

        {/* 说明 */}
        <div className="sw-info">
          <div style={{ fontWeight: 700, marginBottom: 6, color: '#94a3b8' }}>📌 说明</div>
          <p>挖矿所得 5 种元素代币可直接兑换为 RING。</p>
          <p>RING 与 BNB / USDT 的流动性由 PancakeSwap 提供。</p>
          <p>实际成交价受流动性深度影响，请注意滑点。</p>
        </div>
      </aside>

      {/* 右侧卡片 */}
      <div className="sw-main">
        <div className="sw-main-hd">
          <span style={{ fontSize: 20 }}>🔄</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9' }}>代币兑换 Swap</span>
          <span style={{ fontSize: 10, color: '#334155', fontFamily: 'Rajdhani, sans-serif', marginLeft: 4 }}>via PancakeSwap Router</span>
        </div>
        {pair && <SwapCard key={active} pair={pair} />}
      </div>
    </div>
  )
}
