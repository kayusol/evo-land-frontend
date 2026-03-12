import React from 'react'
import { useToast } from '../contexts/ToastContext.jsx'

const COLORS = { ok:'#00ff88', err:'#ff4444', info:'#00d4ff' }
const ICONS  = { ok:'■', err:'✕', info:'◆' }

export default function Toast() {
  const { list, rm } = useToast()
  return (
    <div style={{position:'fixed',bottom:20,right:20,display:'flex',flexDirection:'column',gap:8,zIndex:9999,pointerEvents:'none'}}>
      {list.map(t=>(
        <div key={t.id} onClick={()=>rm(t.id)} className="fade-up" style={{
          display:'flex',alignItems:'flex-start',gap:10,
          background:'var(--bg2)', border:`1px solid ${COLORS[t.type]}40`,
          padding:'12px 16px', minWidth:260, maxWidth:380,
          pointerEvents:'all', cursor:'pointer',
          boxShadow:`0 0 20px ${COLORS[t.type]}20`,
          clipPath:'polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))',
        }}>
          <span style={{color:COLORS[t.type],fontSize:14,flexShrink:0,fontFamily:'var(--font-mono)',marginTop:1}}>{ICONS[t.type]}</span>
          <div>
            <div style={{fontFamily:'var(--font-display)',fontSize:11,color:'var(--text0)',letterSpacing:'0.08em'}}>{t.title}</div>
            {t.msg&&<div style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text2)',marginTop:3,lineHeight:1.4}}>{t.msg}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}
