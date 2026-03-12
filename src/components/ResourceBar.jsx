import React from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { formatEther } from 'viem'
import { CONTRACTS, RES_KEYS, RES_NAMES_ZH, RES_EMOJIS, RES_COLORS } from '../constants/contracts.js'
import { ERC20_ABI } from '../constants/abi.js'

function Bal({ k, emoji, color, zh }) {
  const { address } = useAccount()
  const { data } = useReadContract({
    address: CONTRACTS[k], abi: ERC20_ABI, functionName: 'balanceOf',
    args: [address],
    query: { enabled: !!address && CONTRACTS[k] !== '0x0000000000000000000000000000000000000000' },
  })
  const v = data ? parseFloat(formatEther(data)) : 0
  const fmt = n => n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e3 ? (n/1e3).toFixed(1)+'K' : n.toFixed(2)
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', background:'rgba(255,255,255,0.04)', borderRadius:6, border:'1px solid rgba(255,255,255,0.07)' }}>
      <span style={{ fontSize:15 }}>{emoji}</span>
      <div>
        <div style={{ fontSize:12, fontWeight:700, color, lineHeight:1 }}>{fmt(v)}</div>
        <div style={{ fontSize:9, color:'#475569', marginTop:1 }}>{zh}</div>
      </div>
    </div>
  )
}

export default function ResourceBar() {
  const { isConnected } = useAccount()
  if (!isConnected) return null
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', background:'rgba(17,24,39,0.9)', borderBottom:'1px solid rgba(255,255,255,0.06)', flexWrap:'wrap' }}>
      <Bal k="ring" emoji="💎" color="#a78bfa" zh="RING" />
      {RES_KEYS.map((k,i) => <Bal key={k} k={k} emoji={RES_EMOJIS[i]} color={RES_COLORS[i]} zh={RES_NAMES_ZH[i]} />)}
    </div>
  )
}
