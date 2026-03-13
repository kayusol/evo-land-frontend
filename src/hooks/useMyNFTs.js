/**
 * useMyNFTs — enumerate owned Land / Drill / Apostle NFTs
 * Returns { lands, drills, apostles, isLoading, refetch }
 *
 * Strategy: read balanceOf, then fetch tokenIds via Transfer events
 * (BSC Testnet supports eth_getLogs so this is reliable)
 */
import { useState, useEffect, useCallback } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { parseAbiItem } from 'viem'
import { CONTRACTS } from '../constants/contracts'
import { LAND_ABI, DRILL_ABI, APOSTLE_ABI, ERC721_ABI } from '../constants/abi'

const TRANSFER_EVENT = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
)

async function fetchOwnedIds(client, contractAddr, owner) {
  // Fetch all Transfer events TO owner
  const toOwner = await client.getLogs({
    address: contractAddr,
    event: TRANSFER_EVENT,
    args: { to: owner },
    fromBlock: 0n,
    toBlock: 'latest',
  })
  // Fetch all Transfer events FROM owner (sold/sent away)
  const fromOwner = await client.getLogs({
    address: contractAddr,
    event: TRANSFER_EVENT,
    args: { from: owner },
    fromBlock: 0n,
    toBlock: 'latest',
  })
  const sold = new Set(fromOwner.map(l => l.args.tokenId.toString()))
  const owned = [...new Set(
    toOwner
      .map(l => l.args.tokenId.toString())
      .filter(id => !sold.has(id))
  )]
  return owned.map(BigInt)
}

async function fetchLandDetails(client, id) {
  const [attr, xy] = await Promise.all([
    client.readContract({ address: CONTRACTS.land, abi: LAND_ABI, functionName: 'resourceAttr', args: [id] }),
    client.readContract({ address: CONTRACTS.land, abi: LAND_ABI, functionName: 'decodeId', args: [id] }),
  ])
  const [x, y] = xy
  const a = BigInt(attr)
  return {
    id: id.toString(),
    x: Number(x), y: Number(y),
    gold : Number((a >> 0n)  & 0xffffn),
    wood : Number((a >> 16n) & 0xffffn),
    water: Number((a >> 32n) & 0xffffn),
    fire : Number((a >> 48n) & 0xffffn),
    soil : Number((a >> 64n) & 0xffffn),
  }
}

async function fetchDrillDetails(client, id) {
  const [tier, affinity] = await client.readContract({
    address: CONTRACTS.drill, abi: DRILL_ABI, functionName: 'attrs', args: [id]
  })
  const ELEMENTS = ['Gold','Wood','Water','Fire','Soil']
  return { id: id.toString(), tier: Number(tier), affinity: ELEMENTS[affinity] ?? 'Unknown' }
}

async function fetchApostleDetails(client, id) {
  const [strength, element] = await client.readContract({
    address: CONTRACTS.apostle, abi: APOSTLE_ABI, functionName: 'attrs', args: [id]
  })
  const ELEMENTS = ['Gold','Wood','Water','Fire','Soil']
  return { id: id.toString(), strength: Number(strength), element: ELEMENTS[element] ?? 'Unknown' }
}

export function useMyNFTs() {
  const { address } = useAccount()
  const client = usePublicClient()
  const [state, setState] = useState({ lands: [], drills: [], apostles: [], isLoading: false })

  const load = useCallback(async () => {
    if (!address || !client) return
    setState(s => ({ ...s, isLoading: true }))
    try {
      const [landIds, drillIds, apostleIds] = await Promise.all([
        fetchOwnedIds(client, CONTRACTS.land,    address),
        fetchOwnedIds(client, CONTRACTS.drill,   address),
        fetchOwnedIds(client, CONTRACTS.apostle, address),
      ])
      const [lands, drills, apostles] = await Promise.all([
        Promise.all(landIds.map(id => fetchLandDetails(client, id))),
        Promise.all(drillIds.map(id => fetchDrillDetails(client, id))),
        Promise.all(apostleIds.map(id => fetchApostleDetails(client, id))),
      ])
      setState({ lands, drills, apostles, isLoading: false })
    } catch (e) {
      console.error('useMyNFTs error:', e)
      setState(s => ({ ...s, isLoading: false }))
    }
  }, [address, client])

  useEffect(() => { load() }, [load])

  return { ...state, refetch: load }
}
