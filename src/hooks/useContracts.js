/**
 * useContracts — central hook to get typed contract instances via wagmi
 * Usage:
 *   const { ringToken, landNFT, miningSystem, ... } = useContracts()
 *   const bal = await ringToken.read.balanceOf([address])
 */
import { usePublicClient, useWalletClient } from 'wagmi'
import { getContract } from 'viem'
import { CONTRACTS } from '../constants/contracts'
import {
  ERC20_ABI, LAND_ABI, DRILL_ABI, APOSTLE_ABI,
  MINING_ABI, AUCTION_ABI, REFERRAL_ABI, BLINDBOX_ABI,
} from '../constants/abi'

export function useContracts() {
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const make = (address, abi) => getContract({
    address,
    abi,
    client: { public: publicClient, wallet: walletClient },
  })

  return {
    ringToken   : make(CONTRACTS.ring,    ERC20_ABI),
    goldToken   : make(CONTRACTS.gold,    ERC20_ABI),
    woodToken   : make(CONTRACTS.wood,    ERC20_ABI),
    waterToken  : make(CONTRACTS.water,   ERC20_ABI),
    fireToken   : make(CONTRACTS.fire,    ERC20_ABI),
    soilToken   : make(CONTRACTS.soil,    ERC20_ABI),
    landNFT     : make(CONTRACTS.land,    LAND_ABI),
    drillNFT    : make(CONTRACTS.drill,   DRILL_ABI),
    apostleNFT  : make(CONTRACTS.apostle, APOSTLE_ABI),
    miningSystem: make(CONTRACTS.mining,  MINING_ABI),
    landAuction : make(CONTRACTS.auction, AUCTION_ABI),
    referral    : make(CONTRACTS.referral,REFERRAL_ABI),
    blindBox    : make(CONTRACTS.blindbox,BLINDBOX_ABI),
  }
}
