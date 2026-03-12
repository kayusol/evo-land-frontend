# Evolution Land BSC — Frontend

React + Vite + RainbowKit + viem/wagmi frontend for Evolution Land BSC.

## Stack
- **React 18** + **Vite 5**
- **RainbowKit** — wallet connection UI  
- **wagmi v2 + viem** — chain interactions
- **Zero UI frameworks** — fully custom pixel sci-fi design
- **Fonts**: Orbitron (display) + Share Tech Mono (mono) + Exo 2 (body)

## Pages
| Page | Description |
|---|---|
| World Map | Interactive 100×100 canvas map, zoom/pan, land inspector |
| My Lands | View owned lands, create Dutch auctions |
| Mining | Assign apostles + drills to lands, claim resources |
| Auction | Browse & bid on live Dutch auctions, pay with RING |
| Inventory | Token balances + apostle & drill NFT collection |

## Quick Start

```bash
npm install
npm run dev
```

## Setup After Deployment

1. Run the contract deploy (see `evo-land-bsc` repo)
2. Copy contract addresses from `deployed.json`
3. Fill in `src/constants/contracts.js`

```js
export const CONTRACTS = {
  ring:    '0x...', // RING token
  land:    '0x...', // LandNFT
  drill:   '0x...', // DrillNFT
  apostle: '0x...', // ApostleNFT
  mining:  '0x...', // MiningSystem
  auction: '0x...', // LandAuction
  // + 5 resource tokens
}
```

## Deploy (Vercel / Netlify)
```bash
npm run build
# upload dist/ folder
```

## WalletConnect
Replace `evo-land-bsc-demo` in `src/config/wagmi.js` with a real [WalletConnect projectId](https://cloud.walletconnect.com).
