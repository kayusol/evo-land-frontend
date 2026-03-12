export const CONTRACTS = {
  ring:     '0x0000000000000000000000000000000000000000',
  gold:     '0x0000000000000000000000000000000000000000',
  wood:     '0x0000000000000000000000000000000000000000',
  water:    '0x0000000000000000000000000000000000000000',
  fire:     '0x0000000000000000000000000000000000000000',
  soil:     '0x0000000000000000000000000000000000000000',
  land:     '0x0000000000000000000000000000000000000000',
  drill:    '0x0000000000000000000000000000000000000000',
  apostle:  '0x0000000000000000000000000000000000000000',
  mining:   '0x0000000000000000000000000000000000000000',
  auction:  '0x0000000000000000000000000000000000000000',
  referral: '0x0000000000000000000000000000000000000000',  // ReferralReward
}

export const LAND_COLORS = [
  '#c8940a',  // GOLD  黄金大陆
  '#1ab89a',  // WOOD  森林绿洲
  '#1d4ed8',  // WATER 水源大陆
  '#b91c1c',  // FIRE  火焰熔岩
  '#6d28d9',  // SOIL  土地荒原
]

export const RES_KEYS     = ['gold', 'wood', 'water', 'fire', 'soil']
export const RES_NAMES_ZH = ['黄金', '木材', '水源', '火焰', '土地']
export const RES_NAMES_EN = ['GOLD',  'WOOD',  'WATER',  'FIRE',  'SOIL']
export const RES_EMOJIS   = ['🪙',   '🌲',   '💧',    '🔥',  '⛰'  ]
export const RES_COLORS   = ['#fbbf24','#4ade80','#38bdf8','#f87171','#a78bfa']

export const ZERO = '0x0000000000000000000000000000000000000000'
export const BSC_EXPLORER = 'https://testnet.bscscan.com'

export function isDeployed(key) {
  const addr = CONTRACTS[key]
  return !!addr && addr !== ZERO
}
