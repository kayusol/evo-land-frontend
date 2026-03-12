import React, { useState, useEffect } from 'react'
import { useAccount, usePublicClient, useReadContract } from 'wagmi'
import { formatEther, getContract } from 'viem'
import { CONTRACTS, RESOURCE_ICONS, RESOURCE_COLORS, RESOURCE_NAMES, RESOURCE_KEYS, isDeployed } from '../constants/contracts.js'
import { APOSTLE_ABI, DRILL_ABI, ERC20_ABI } from '../constants/abi.js'
import { ApostleCard, DrillCard } from '../components/NFTCard.jsx'
import StatBar from '../components/StatBar.jsx'
import { useToast } from '../contexts/ToastContext.jsx'

export default function Inventory() {
  const { address } = useAccount()
  const pub = usePublicClient()
  const { toast } = useToast()
  const [apostles,setApostles]=useState([])
  const [drills,setDrills]=useState([])
  const [loading,setLoading]=useState(false)
  const [tab,setTab]=useState('tokens')
  const dep = isDeployed('apostle')

  const getOwned = async(addr,abi)=>{
    const f1=await pub.createContractEventFilter({address:addr,abi,eventName:'Transfer',args:{to:address},fromBlock:0n})
    const rcv=await pub.getFilterLogs({filter:f1})
    const ids=new Set(rcv.map(e=>Number(e.args.tokenId)))
    const f2=await pub.createContractEventFilter({address:addr,abi,eventName:'Transfer',args:{from:address},fromBlock:0n})
    const snt=await pub.getFilterLogs({filter:f2})
    snt.forEach(e=>ids.delete(Number(e.args.tokenId)))
    return [...ids]
  }

  const load = async()=>{
    if(!address||!pub||!dep) return
    setLoading(true)
    try{
      const [aIds,dIds]=await Promise.all([getOwned(CONTRACTS.apostle,APOSTLE_ABI),getOwned(CONTRACTS.drill,DRILL_ABI)])
      const ac=getContract({address:CONTRACTS.apostle,abi:APOSTLE_ABI,client:pub})
      const dc=getContract({address:CONTRACTS.drill,abi:DRILL_ABI,client:pub})
      const [as,ds]=await Promise.all([
        Promise.all(aIds.map(async id=>{const a=await ac.read.attrs([id]);return{tokenId:id,strength:Number(a.strength),element:Number(a.element)}}))
        ,Promise.all(dIds.map(async id=>{const a=await dc.read.attrs([id]);return{tokenId:id,tier:Number(a.tier),affinity:Number(a.affinity)}}))
      ])
      setApostles(as);setDrills(ds)
    }catch(e){}
    finally{setLoading(false)}
  }
  useEffect(()=>{load()},[address])

  if(!address) return <div className="not-connected"><div className="nc-icon">✦</div><h2>CONNECT WALLET</h2><p>// required to view inventory</p></div>

  const tokenKeys = [['ring','⬡','var(--gold)','RING','Main currency'],
    ...RESOURCE_KEYS.map((k,i)=>([k,['🪙','🌲','💧','🔥','⛰'][i],RESOURCE_COLORS[i],k.toUpperCase(),'Mining reward']))
  ]

  return (
    <div>
      <StatBar/>
      <div className="page-head">
        <div><div className="page-title">INVENTORY</div><div className="page-sub">// TOKENS & NFTS</div></div>
        <button className="btn" onClick={()=>load()} disabled={loading}>{loading?<span className="spin">◌</span>:'↻'} REFRESH</button>
      </div>

      <div className="tabs">
        {[['tokens','◈ TOKENS'],['apostles','🧙 APOSTLES'],['drills','⛏ DRILLS']].map(([id,l])=>(
          <button key={id} className={`tab${tab===id?' active':''}`} onClick={()=>setTab(id)}>{l}</button>
        ))}
      </div>

      {tab==='tokens'&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:12}}>
          {tokenKeys.map(([k,icon,color,label,sub])=>(
            <TokenCard key={k} addr={CONTRACTS[k]} icon={icon} color={color} label={label} sub={sub}/>
          ))}
        </div>
      )}

      {tab==='apostles'&&(
        !dep?<div className="panel deploy-notice"><span className="tag tag-gold">⚠ NOT DEPLOYED</span></div>:
        loading?<div className="grid-cards">{Array.from({length:4}).map((_,i)=><div key={i} className="panel skeleton" style={{height:200}}/>)}</div>:
        apostles.length===0?<div className="empty-state"><div className="empty-icon">🧙</div><h3>NO APOSTLES</h3><p>// apostles are workers that mine your lands</p></div>:
        <div className="grid-cards">{apostles.map(a=><ApostleCard key={a.tokenId} {...a}/>)}</div>
      )}

      {tab==='drills'&&(
        !dep?<div className="panel deploy-notice"><span className="tag tag-gold">⚠ NOT DEPLOYED</span></div>:
        loading?<div className="grid-cards">{Array.from({length:4}).map((_,i)=><div key={i} className="panel skeleton" style={{height:200}}/>)}</div>:
        drills.length===0?<div className="empty-state"><div className="empty-icon">⛏</div><h3>NO DRILLS</h3><p>// drills boost mining output when equipped</p></div>:
        <div className="grid-cards">{drills.map(d=><DrillCard key={d.tokenId} {...d}/>)}</div>
      )}
    </div>
  )
}

function TokenCard({addr,icon,color,label,sub}) {
  const {address:acct}=useAccount()
  const {data:raw}=useReadContract({address:addr,abi:ERC20_ABI,functionName:'balanceOf',args:[acct],query:{enabled:!!acct&&!!addr&&addr!=='0x0000000000000000000000000000000000000000'}})
  const val=raw?parseFloat(formatEther(raw)):0
  const fmt=v=>v>=1e6?(v/1e6).toFixed(2)+'M':v>=1e3?(v/1e3).toFixed(2)+'K':v.toFixed(4)
  return (
    <div className="panel" style={{padding:'14px 16px',display:'flex',alignItems:'center',gap:12}}>
      <span style={{fontSize:28,flexShrink:0,color}}>{icon}</span>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontFamily:'var(--font-mono)',fontSize:9,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'0.1em'}}>{label}</div>
        <div style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:700,color,lineHeight:1.2,marginTop:3}}>{fmt(val)}</div>
        <div style={{fontFamily:'var(--font-mono)',fontSize:9,color:'var(--text3)',marginTop:3}}>{sub}</div>
      </div>
    </div>
  )
}
