import React from 'react'
import { useToast } from '../contexts/ToastContext.jsx'

const C = { ok: '#4ade80', err: '#f87171', info: '#60a5fa' }
const I = { ok: '✓', err: '✕', info: 'ℹ' }

export default function Toast() {
  const { list, rm } = useToast()
  return (
    <div style={{ position:'fixed', bottom:20, right:20, display:'flex', flexDirection:'column', gap:8, zIndex:9999, pointerEvents:'none' }}>
      {list.map(t => (
        <div key={t.id} onClick={() => rm(t.id)} className="fade-in" style={{
          display:'flex', alignItems:'flex-start', gap:10,
          background:'#1e293b', border:`1px solid ${C[t.type]}40`,
          borderRadius:10, padding:'12px 16px', minWidth:260, maxWidth:360,
          pointerEvents:'all', cursor:'pointer',
          boxShadow:`0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px ${C[t.type]}20`,
        }}>
          <span style={{ color:C[t.type], fontSize:15, flexShrink:0, fontWeight:700, marginTop:1 }}>{I[t.type]}</span>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'#f1f5f9', marginBottom:2 }}>{t.title}</div>
            {t.msg && <div style={{ fontSize:12, color:'#94a3b8', lineHeight:1.4 }}>{t.msg}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}
