export const CONTRACTS = {
  ring:    '0x0000000000000000000000000000000000000000',
  gold:    '0x0000000000000000000000000000000000000000',
  wood:    '0x0000000000000000000000000000000000000000',
  water:   '0x0000000000000000000000000000000000000000',
  fire:    '0x0000000000000000000000000000000000000000',
  soil:    '0x0000000000000000000000000000000000000000',
  land:    '0x0000000000000000000000000000000000000000',
  drill:   '0x0000000000000000000000000000000000000000',
  apostle: '0x0000000000000000000000000000000000000000',
  mining:  '0x0000000000000000000000000000000000000000',
  auction: '0x0000000000000000000000000000000000000000',
}
export const ZERO = '0x0000000000000000000000000000000000000000'
export const isDeployed = (k) => CONTRACTS[k] !== ZERO

export const RES_NAMES_ZH = ['黄金', '木材', '水源', '火焰', '土地']
export const RES_NAMES_EN = ['Gold', 'Wood', 'Water', 'Fire', 'Soil']
export const RES_KEYS     = ['gold', 'wood', 'water', 'fire', 'soil']
export const RES_EMOJIS   = ['🪙', '🌲', '💧', '🔥', '⛰']
export const RES_COLORS   = ['#fbbf24', '#4ade80', '#38bdf8', '#f87171', '#a78bfa']

// 地块颜色 — 高饱和度，接近原版进化星球
export const LAND_COLORS = [
  '#d4a017',   // gold  - 深黄
  '#2dd4bf',   // wood  - 青绿（截图里水/木区域是青色）
  '#2563eb',   // water - 蓝
  '#dc2626',   // fire  - 红
  '#7c3aed',   // soil  - 紫蓝（截图里大块是蓝紫色）
]

export const BSC_EXPLORER = 'https://testnet.bscscan.com'
