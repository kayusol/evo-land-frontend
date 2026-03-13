/**
 * useTokenBalances — reads RING + 5 resource token balances for connected wallet
 * Returns: { ring, gold, wood, water, fire, soil, isLoading, refetch }
 * All values are formatted strings (e.g. '12.34')
 */
import { useAccount, useReadContracts } from 'wagmi'
import { formatUnits } from 'viem'
import { CONTRACTS } from '../constants/contracts'
import { ERC20_ABI } from '../constants/abi'

const TOKEN_LIST = [
  { key: 'ring',  addr: CONTRACTS.ring  },
  { key: 'gold',  addr: CONTRACTS.gold  },
  { key: 'wood',  addr: CONTRACTS.wood  },
  { key: 'water', addr: CONTRACTS.water },
  { key: 'fire',  addr: CONTRACTS.fire  },
  { key: 'soil',  addr: CONTRACTS.soil  },
]

export function useTokenBalances() {
  const { address } = useAccount()

  const contracts = TOKEN_LIST.map(t => ({
    address: t.addr,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address ?? '0x0000000000000000000000000000000000000000'],
  }))

  const { data, isLoading, refetch } = useReadContracts({
    contracts,
    query: { enabled: !!address, refetchInterval: 15_000 },
  })

  const fmt = (raw) => raw ? Number(formatUnits(raw, 18)).toFixed(2) : '0.00'

  const balances = {}
  TOKEN_LIST.forEach((t, i) => {
    balances[t.key] = fmt(data?.[i]?.result)
  })

  return { ...balances, isLoading, refetch }
}
