import React, { useState, useEffect } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { parseEther, getContract } from 'viem'
import { CONTRACTS, ZERO, isDeployed } from '../constants/contracts.js'
import { LAND_ABI, AUCTION_ABI } from '../constants/abi.js'
import { LandCard } from '../components/NFTCard.jsx'
import StatBar from '../components/StatBar.jsx'
import { useToast } from '../contexts/ToastContext.jsx'

function decodeRates(attr80) {
  const n = BigInt(attr80)
  return Array.from({length:5},(_,i)=>Number((n>>BigInt(i*16))&0xFFFFn))
}

export default function MyLands() {
  const { address } = useAccount()
  const pub = usePublicClient()
  const { data: wal } = useWalletClient()
  const { toast } = useToast()
  const [lands,setLands]=useState([])
  const [loading,setLoading]=useState(false)
  const [sel,setSel]=useState(null)
  const [form,setForm]=useState({start:'10',end:'1',days:'7',show:false})
  const [tx,setTx]=useState(false)
  const deployed = isDeployed('land')

  const load = async () => {
    if (!address||!pub||!deployed) return
    setLoading(true)
    try {
      const lc = getContract({address:CONTRACTS.land,abi:LAND_ABI,client:pub})
      const filter = await pub.createContractEventFilter({address:CONTRACTS.land,abi:LAND_ABI,eventName:'Transfer',args:{to:address},fromBlock:0n})
      const rcv = await pub.getFilterLogs({filter})
      const ids = new Set(rcv.map(e=>Number(e.args.tokenId)))
      const filter2 = await pub.createContractEventFilter({address:CONTRACTS.land,abi:LAND_ABI,eventName:'Transfer',args:{from:address},fromBlock:0n})
      const snt = await pub.getFilterLogs({filter:filter2})
      snt.forEach(e=>ids.delete(Number(e.args.tokenId)))
      const items = await Promise.all([...ids].map(async id=>{
        const [x,y] = await lc.read.decodeId([id])
        const attr = await lc.read.resourceAttr([id])
        return {tokenId:id,x:Number(x),y:Number(y),rates:decodeRates(attr)}
      }))
      setLands(items)
    } catch(e){toast.err('Load Failed',e.message?.slice(0,80))}
    finally{setLoading(false)}
  }
  useEffect(()=>{load()},[address])

  const createAuction = async () => {
    if (!wal||!sel) return
    setTx(true)
    try {
      const lc = getContract({address:CONTRACTS.land,abi:LAND_ABI,client:wal})
      const ac = getContract({address:CONTRACTS.auction,abi:AUCTION_ABI,client:wal})
      const approved = await pub.readContract({address:CONTRACTS.land,abi:LAND_ABI,functionName:'getApproved',args:[sel.tokenId]})
      if (approved.toLowerCase()!==CONTRACTS.auction.toLowerCase()) {
        const h = await lc.write.approve([CONTRACTS.auction, sel.tokenId])
        await pub.waitForTransactionReceipt({hash:h})
      }
      const h = await ac.write.createAuction([sel.tokenId, parseEther(form.start), parseEther(form.end), BigInt(Number(form.days)*86400)])
      await pub.waitForTransactionReceipt({hash:h})
      toast.ok('Auction Created!',`Land #${sel.tokenId} listed`)
      setForm(f=>({...f,show:false})); load()
    } catch(e){toast.err('Failed',e.message?.slice(0,100))}
    finally{setTx(false)}
  }

  if (!address) return <div className="not-connected"><div className="nc-icon">◈</div><h2>CONNECT WALLET</h2><p>// required to view your lands</p></div>

  return (
    <div>
      <StatBar/>
      <div className="page-head">
        <div><div className="page-title">MY LANDS</div><div className="page-sub">// {lands.length} PARCELS OWNED</div></div>
        <button className="btn" onClick={load} disabled={loading}>{loading?<span className="spin">◌</span>:'↻'} REFRESH</button>
      </div>
      {!deployed?(
        <div className="panel deploy-notice"><span className="tag tag-gold">⚠ NOT DEPLOYED</span><p>Fill contract addresses in <code>src/constants/contracts.js</code></p></div>
      ):loading?(
        <div className="grid-cards">{Array.from({length:6}).map((_,i)=><div key={i} className="panel skeleton" style={{height:180}}/>)}</div>
      ):lands.length===0?(
        <div className="empty-state"><div className="empty-icon">◈</div><h3>NO LANDS FOUND</h3><p>// buy from auction to start mining</p></div>
      ):(
        <div className="grid-cards">
          {lands.map(l=>(
            <LandCard key={l.tokenId} {...l} selected={sel?.tokenId===l.tokenId} onClick={()=>setSel(s=>s?.tokenId===l.tokenId?null:l)}>
              <button className="btn btn-gold" style={{fontSize:9,padding:'4px 10px'}} onClick={e=>{e.stopPropagation();setSel(l);setForm(f=>({...f,show:true}))}}>SELL</button>
            </LandCard>
          ))}
        </div>
      )}

      {form.show&&sel&&(
        <div className="modal-overlay" onClick={()=>setForm(f=>({...f,show:false}))}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-head"><h2>CREATE AUCTION</h2><button onClick={()=>setForm(f=>({...f,show:false}))}>×</button></div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text2)',marginBottom:16}}>LAND #{String(sel.tokenId).padStart(5,'0')} · ({sel.x},{sel.y})</div>
            {[['START PRICE (RING)','start'],['END PRICE (RING)','end'],['DURATION (DAYS)','days']].map(([l,k])=>(
              <div key={k} className="form-row">
                <label>{l}</label>
                <input type="number" value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}/>
              </div>
            ))}
            <div className="modal-actions">
              <button className="btn" onClick={()=>setForm(f=>({...f,show:false}))}>CANCEL</button>
              <button className="btn btn-primary" onClick={createAuction} disabled={tx}>{tx?<span className="spin">◌</span>:null} CREATE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
