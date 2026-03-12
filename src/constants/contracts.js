// ================================================================
// Fill these after running the deploy script
// ================================================================
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

export const RESOURCE_NAMES  = ['Gold', 'Wood', 'Water', 'Fire', 'Soil']
export const RESOURCE_ICONS  = ['◈', '✦', '◉', '⬡', '◆']
export const RESOURCE_EMOJIS = ['🪙', '🌲', '💧', '🔥', '⛰']
export const RESOURCE_KEYS   = ['gold', 'wood', 'water', 'fire', 'soil']
export const RESOURCE_COLORS = ['#ffd700', '#00ff88', '#00d4ff', '#ff4444', '#cc9966']

export const BSC_TESTNET_EXPLORER = 'https://testnet.bscscan.com'
