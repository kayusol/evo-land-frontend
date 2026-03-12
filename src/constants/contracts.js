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
export const RES_COLORS   = ['#f59e0b', '#22c55e', '#06b6d4', '#ef4444', '#a78bfa']

// 与原版进化星球截图完全对应的颜色
// 截图主色: 大片红色(fire), 蓝紫色(soil/water), 少量青绿(wood), 黄色(gold)
export const LAND_COLORS = [
  '#c8940a',   // 0 gold  - 深黄
  '#16a34a',   // 1 wood  - 深绿
  '#7c3aed',   // 2 water - 蓝紫 (截图大片紫色区域)
  '#dc2626',   // 3 fire  - 红色 (截图大片红色区域)
  '#0891b2',   // 4 soil  - 青蓝
]

export const BSC_EXPLORER = 'https://testnet.bscscan.com'
