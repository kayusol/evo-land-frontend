import { createConfig, http } from 'wagmi'
import { getDefaultConfig } from '@rainbow-me/rainbowkit'

export const bscTestnet = {
  id: 97,
  name: 'BSC Testnet',
  nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
  rpcUrls: { default: { http: ['https://bsc-testnet-rpc.publicnode.com'] } },
  blockExplorers: { default: { name: 'BscScan', url: 'https://testnet.bscscan.com' } },
  testnet: true,
}

export const wagmiConfig = getDefaultConfig({
  appName: 'Evolution Land BSC',
  projectId: 'evo-land-bsc-demo', // replace with real WalletConnect projectId
  chains: [bscTestnet],
  transports: { [bscTestnet.id]: http('https://bsc-testnet-rpc.publicnode.com') },
  ssr: false,
})
