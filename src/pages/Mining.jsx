import React, { useState, useEffect, useCallback } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { getContract } from 'viem'
import { formatEther } from 'viem'
import { CONTRACTS, RESOURCE_ICONS, RESOURCE_COLORS, RESOURCE_NAMES, isDeployed } from '../constants/contracts.js'
import { LAND_ABI, DRILL_ABI, APOSTLE_ABI, MINING_ABI } from '../constants/abi.js'
import { useToast } from '../contexts/ToastContext.jsx'

function decodeRates(attr80) {
  const n=BigInt(attr80); return Array.from({length:5},(_,i)=>Number((n>>BigInt(i*16))&0xFFFFn))
}

export default function Mining() {
  const { address } = useAccount()
  const pub = usePublicClient()
  const { data: wal } = useWalletClient()
  const { toast } = useToast()
  const [lands,setLands]=useState([])
  const [apostles,setApostles]=useState([])
  const [drills,setDrills]=useState([])
  const [active,setActive]=useState(null)
  const [slots,setSlots]=useState([])
  const [pending,setPending]=useState([])
  const [loading,setLoading]=useState(false)
  const [txKey,setTxKey]=useState('')
  const [modal,setModal]=useState({show:false,apo:'',drill:'0'})
  const dep = isDeployed('land')

  const getOwned = async (addr,abi) => {
    const f1 = await pub.createContractEventFilter({address:addr,abi,eventName:'Transfer',args:{to:address},fromBlock:0n})
    const rcv = await pub.getFilterLogs({filter:f1})
    const ids = new Set(rcv.map(e=>Number(e.args.tokenId)))
    const f2 = await pub.createContractEventFilter({address:addr,abi,eventName:'Transfer',args:{from:address},fromBlock:0n})
    const snt = await pub.getFilterLogs({filter:f2})
    snt.forEach(e=>ids.delete(Number(e.args.tokenId)))
    return [...ids]
  }

  const loadAll = useCallback(async()=>{
    if(!address||!pub||!dep) return
    setLoading(true)
    try {
      const [lids,aids,dids] = await Promise.all([getOwned(CONTRACTS.land,LAND_ABI),getOwned(CONTRACTS.apostle,APOSTLE_ABI),getOwned(CONTRACTS.drill,DRILL_ABI)])
      const lc=getContract({address:CONTRACTS.land,abi:LAND_ABI,client:pub})
      const ac=getContract({address:CONTRACTS.apostle,abi:APOSTLE_ABI,client:pub})
      const dc=getContract({address:CONTRACTS.drill,abi:DRILL_ABI,client:pub})
      const [ls,as,ds]=await Promise.all([
        Promise.all(lids.map(async id=>{const[x,y]=await lc.read.decodeId([id]);const attr=await lc.read.resourceAttr([id]);return{tokenId:id,x:Number(x),y:Number(y),rates:decodeRates(attr)}})),
        Promise.all(aids.map(async id=>{const a=await ac.read.attrs([id]);return{tokenId:id,strength:Number(a.strength),element:Number(a.element)}})),
        Promise.all(dids.map(async id=>{const a=await dc.read.attrs([id]);return{tokenId:id,tier:Number(a.tier),affinity:Number(a.affinity)}})),
      ])
      setLands(ls);setApostles(as);setDrills(ds)
    }catch(e){toast.err('Load Failed',e.message?.slice(0,80))}
    finally{setLoading(false)}
  },[address,pub,dep])

  const loadSlots = useCallback(async(landId)=>{
    if(!landId||!pub||!dep) return
    try{
      const mc=getContract({address:CONTRACTS.mining,abi:MINING_ABI,client:pub})
      const cnt=Number(await mc.read.slotCount([landId]))
      const sd=await Promise.all(Array.from({length:cnt},(_,i)=>mc.read.slots([landId,i])))
      setSlots(sd.map(s=>({apo:Number(s.apostleId),drill:Number(s.drillId),t:Number(s.startTime)})))
      const rw=await mc.read.pendingRewards([landId])
      setPending(rw.map(r=>formatEther(r)))
    }catch{setSlots([]);setPending([])}
  },[pub,dep])

  useEffect(()=>{loadAll()},[loadAll])
  useEffect(()=>{if(active)loadSlots(active.tokenId)},[active,loadSlots])

  const start = async()=>{
    if(!wal||!active) return
    setTxKey('start')
    try{
      const mc=getContract({address:CONTRACTS.mining,abi:MINING_ABI,client:wal})
      const ac=getContract({address:CONTRACTS.apostle,abi:APOSTLE_ABI,client:wal})
      let h=await ac.write.setApprovalForAll([CONTRACTS.mining,true]); await pub.waitForTransactionReceipt({hash:h})
      const dId=BigInt(modal.drill)
      if(dId!==0n){
        const dc=getContract({address:CONTRACTS.drill,abi:DRILL_ABI,client:wal})
        h=await dc.write.setApprovalForAll([CONTRACTS.mining,true]); await pub.waitForTransactionReceipt({hash:h})
      }
      h=await mc.write.startMining([BigInt(active.tokenId),BigInt(modal.apo),dId]); await pub.waitForTransactionReceipt({hash:h})
      toast.ok('Mining Started',`Apostle #${modal.apo} working`)
      setModal({show:false,apo:'',drill:'0'}); loadSlots(active.tokenId); loadAll()
    }catch(e){toast.err('Failed',e.message?.slice(0,100))}
    finally{setTxKey('')}
  }

  const stop = async(apoId)=>{
    if(!wal||!active) return
    setTxKey('s'+apoId)
    try{
      const mc=getContract({address:CONTRACTS.mining,abi:MINING_ABI,client:wal})
      const h=await mc.write.stopMining([BigInt(active.tokenId),BigInt(apoId)]); await pub.waitForTransactionReceipt({hash:h})
      toast.ok('Stopped',`Apostle #${apoId} returned`); loadSlots(active.tokenId); loadAll()
    }catch(e){toast.err('Failed',e.message?.slice(0,100))}
    finally{setTxKey('')}
  }

  const claim = async()=>{
    if(!wal||!active) return
    setTxKey('claim')
    try{
      const mc=getContract({address:CONTRACTS.mining,abi:MINING_ABI,client:wal})
      const h=await mc.write.claim([BigInt(active.tokenId)]); await pub.waitForTransactionReceipt({hash:h})
      toast.ok('Claimed!','Resources sent to your wallet'); loadSlots(active.tokenId)
    }catch(e){toast.err('Failed',e.message?.slice(0,100))}
    finally{setTxKey('')}
  }

  if(!address) return <div className="not-connected"><div className="nc-icon">⛏</div><h2>CONNECT WALLET</h2><p>// required to manage mining</p></div>
  if(!dep) return <div className="panel deploy-notice"><span className="tag tag-gold">⚠ NOT DEPLOYED</span><p>Fill contract addresses in <code>src/constants/contracts.js</code></p></div>

  return (
    <div style={{display:'grid',gridTemplateColumns:'190px 1fr',gap:16,height:'calc(100vh - 130px)'}}>
      {/* Land list */}
      <div style={{overflowY:'auto',display:'flex',flexDirection:'column',gap:6}}>
        <div className="section-title" style={{marginBottom:8,paddingLeft:2}}>SELECT LAND</div>
        {loading?<div className="panel skeleton" style={{height:70}}/>:
         lands.length===0?<p style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text2)'}}>// no lands</p>:
         lands.map(l=>(
          <div key={l.tokenId} onClick={()=>setActive(l)} style={{
            background:active?.tokenId===l.tokenId?'rgba(0,255,136,0.07)':'var(--bg1)',
            border:`1px solid ${active?.tokenId===l.tokenId?'var(--green)':'var(--border)'}`,
            padding:'10px 12px', cursor:'pointer', transition:'all 0.15s',
          }}>
            <div style={{fontFamily:'var(--font-mono)',fontSize:12,color:active?.tokenId===l.tokenId?'var(--green)':'var(--text1)'}}>#{String(l.tokenId).padStart(5,'0')}</div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:9,color:'var(--text2)',marginTop:2}}>({l.x},{l.y})</div>
            <div style={{display:'flex',gap:2,alignItems:'flex-end',height:14,marginTop:6}}>
              {l.rates.map((r,i)=><div key={i} style={{width:7,background:RESOURCE_COLORS[i],opacity:0.4+r/200*0.6,height:Math.max(2,r/10)}}/>)}
            </div>
          </div>
        ))}
      </div>

      {/* Detail */}
      <div className="panel" style={{padding:18,overflowY:'auto',display:'flex',flexDirection:'column',gap:14,position:'relative'}}>
        {!active?(
          <div className="empty-state"><div className="empty-icon" style={{fontSize:40}}>⛰</div><h3>SELECT A LAND</h3><p>// choose a land parcel to manage mining ops</p></div>
        ):(
          <>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:10}}>
              <div>
                <div className="page-title" style={{fontSize:14}}>LAND #{String(active.tokenId).padStart(5,'0')}</div>
                <div className="page-sub">({active.x},{active.y}) · {slots.length}/5 SLOTS ACTIVE</div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button className="btn" onClick={claim} disabled={!!txKey||pending.every(p=>parseFloat(p)===0)}>{txKey==='claim'?<span className="spin">◌</span>:null} CLAIM</button>
                <button className="btn btn-primary" onClick={()=>setModal({show:true,apo:'',drill:'0'})} disabled={slots.length>=5}>+ MINE</button>
              </div>
            </div>

            {/* Pending */}
            <div style={{display:'flex',gap:12,flexWrap:'wrap',background:'var(--bg0)',border:'1px solid var(--border)',padding:'10px 14px'}}>
              <div style={{fontFamily:'var(--font-mono)',fontSize:9,color:'var(--text2)',alignSelf:'center',marginRight:4}}>PENDING:</div>
              {pending.map((amt,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:6}}>
                  <span style={{fontSize:14}}>{['🪙','🌲','💧','🔥','⛰'][i]}</span>
                  <div>
                    <div style={{fontFamily:'var(--font-mono)',fontSize:12,fontWeight:700,color:RESOURCE_COLORS[i],lineHeight:1}}>{parseFloat(amt).toFixed(4)}</div>
                    <div style={{fontFamily:'var(--font-mono)',fontSize:9,color:'var(--text2)',textTransform:'uppercase'}}>{RESOURCE_NAMES[i]}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="section-title">ACTIVE WORKERS</div>
            {slots.length===0?(
              <p style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text2)'}}>// no apostles deployed · start mining to earn resources</p>
            ):slots.map((s,i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 12px',background:'var(--bg0)',border:'1px solid var(--border)'}}>
                <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                  <span style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text0)',background:'var(--bg2)',border:'1px solid var(--border)',padding:'2px 8px'}}>🧙 #{s.apo}</span>
                  {s.drill>0&&<span style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--cyan)',background:'var(--bg2)',border:'1px solid rgba(0,212,255,0.2)',padding:'2px 8px'}}>⛏ #{s.drill}</span>}
                  <span style={{fontFamily:'var(--font-mono)',fontSize:9,color:'var(--text2)'}}>{new Date(s.t*1000).toLocaleString()}</span>
                </div>
                <button className="btn btn-danger" style={{fontSize:9,padding:'4px 10px'}} onClick={()=>stop(s.apo)} disabled={txKey==='s'+s.apo}>{txKey==='s'+s.apo?<span className="spin">◌</span>:'STOP'}</button>
              </div>
            ))}
          </>
        )}
      </div>

      {modal.show&&(
        <div className="modal-overlay" onClick={()=>setModal(m=>({...m,show:false}))}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-head"><h2>START MINING</h2><button onClick={()=>setModal(m=>({...m,show:false}))}>×</button></div>
            <div className="form-row">
              <label>SELECT APOSTLE</label>
              <select value={modal.apo} onChange={e=>setModal(m=>({...m,apo:e.target.value}))}>
                <option value="">-- CHOOSE APOSTLE --</option>
                {apostles.map(a=><option key={a.tokenId} value={a.tokenId}>#{a.tokenId} · STR:{a.strength} · {RESOURCE_NAMES[a.element]}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>SELECT DRILL (OPTIONAL)</label>
              <select value={modal.drill} onChange={e=>setModal(m=>({...m,drill:e.target.value}))}>
                <option value="0">NO DRILL</option>
                {drills.map(d=><option key={d.tokenId} value={d.tokenId}>#{d.tokenId} · T{d.tier} · {RESOURCE_NAMES[d.affinity]} +{d.tier*20}%</option>)}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={()=>setModal(m=>({...m,show:false}))}>CANCEL</button>
              <button className="btn btn-primary" onClick={start} disabled={!modal.apo||txKey==='start'}>{txKey==='start'?<span className="spin">◌</span>:null} DEPLOY</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
