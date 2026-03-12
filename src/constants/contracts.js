// ============================================================
// 部署合约后，将地址填入此处
// Fill in contract addresses after deployment
// ============================================================
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

// 资源相关常量
export const RES_NAMES_ZH = ['黄金', '木材', '水源', '火焰', '土地']
export const RES_NAMES_EN = ['Gold', 'Wood', 'Water', 'Fire', 'Soil']
export const RES_KEYS     = ['gold', 'wood', 'water', 'fire', 'soil']
export const RES_EMOJIS   = ['🪙', '🌲', '💧', '🔥', '⛰']
export const RES_COLORS   = ['#fbbf24', '#4ade80', '#38bdf8', '#f87171', '#a78bfa']

// 地块颜色 - 高饱和度，接近原版进化星球截图
// Gold=深黄, Wood=青绿(截图里水/木区域), Water=蓝, Fire=红, Soil=紫蓝
export const LAND_COLORS = [
  '#c8940a',   // 0 gold  - 土黄
  '#1ab89a',   // 1 wood  - 青绿（截图大块青绿区）
  '#1d4ed8',   // 2 water - 蓝
  '#b91c1c',   // 3 fire  - 深红
  '#6d28d9',   // 4 soil  - 紫（截图里大块蓝紫区）
]

export const BSC_EXPLORER = 'https://testnet.bscscan.com'
