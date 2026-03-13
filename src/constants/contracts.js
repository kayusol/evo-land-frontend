// ─────────────────────────────────────────────────────────────
//  Evolution Land BSC — Deployed Contract Addresses
//  Network : BSC Testnet (chainId 97)
//  Deployer: 0xe149fd4EFc7485ffae69f844bc93EA87a6a2e5b2
// ─────────────────────────────────────────────────────────────

export const CONTRACTS = {
  // ── Tokens ──────────────────────────────────────────────────
  ring  : '0x964330A11154BeB9492472d3F6110C7AffeD1a71',
  gold  : '0xfFbEBd306E88be2cF7280C22fdDa53625C70474a',
  wood  : '0xa120B7004c689f3bE75707302EEB9159DaBF6FC1',
  water : '0xd2f694E5847e0720a174cE3dd3cbBfe530AB7044',
  fire  : '0x19C4cb86e9a5CebDA159814bb01d22E862FB747E',
  soil  : '0x1a4FE01aff414741669A08DfA5F27eEFde42AA62',

  // ── NFTs ────────────────────────────────────────────────────
  land   : '0x5731E35E643e394D5Ca80a947A48B63Bd02c5974',
  drill  : '0xfC3D09503eAAd8f0FB4a51b2307C8Dfb66aA3D3a',
  apostle: '0x9fC3F897dbB12D2F45975bA1fee32de1Ae93f6A6',

  // ── Systems (deployed after tBNB top-up) ────────────────────
  mining  : '0x0000000000000000000000000000000000000000',  // TODO: fill after resume
  auction : '0x0000000000000000000000000000000000000000',  // TODO
  referral: '0x0000000000000000000000000000000000000000',  // TODO
  blindbox: '0x0000000000000000000000000000000000000000',  // TODO
}

// Shorthand token list for resource bar / swap / assets
export const RESOURCE_TOKENS = [
  { key: 'gold',  label: 'GOLD',  addr: CONTRACTS.gold,  icon: '⚡', color: '#f59e0b' },
  { key: 'wood',  label: 'WOOD',  addr: CONTRACTS.wood,  icon: '🌿', color: '#22c55e' },
  { key: 'water', label: 'HHO',   addr: CONTRACTS.water, icon: '💧', color: '#38bdf8' },
  { key: 'fire',  label: 'FIRE',  addr: CONTRACTS.fire,  icon: '🔥', color: '#ef4444' },
  { key: 'soil',  label: 'SIOO', addr: CONTRACTS.soil,  icon: '🪨', color: '#a78bfa' },
]

export const CHAIN_ID = 97
export const BSC_TESTNET_RPC = 'https://data-seed-prebsc-1-s1.binance.org:8545'
export const DEPLOYER = '0xe149fd4EFc7485ffae69f844bc93EA87a6a2e5b2'
