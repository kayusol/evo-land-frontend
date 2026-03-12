// 部署合约后在此填写地址
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

// 地块颜色（与原版进化星球相似）
export const LAND_COLORS = [
  'rgba(251,191,36,0.75)',  // 0 gold  - 黄
  'rgba(74,222,128,0.75)',  // 1 wood  - 绿（水区域用青绿）
  'rgba(45,212,191,0.75)', // 2 water - 青绿
  'rgba(248,113,113,0.75)',// 3 fire  - 红
  'rgba(167,139,250,0.75)',// 4 soil  - 紫蓝
]

export const BSC_EXPLORER = 'https://testnet.bscscan.com'
