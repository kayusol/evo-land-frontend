export const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'address' }, { name: '', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '', type: 'address' }, { name: '', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { name: 'transfer', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '', type: 'address' }, { name: '', type: 'uint256' }], outputs: [{ type: 'bool' }] },
]
export const ERC721_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'ownerOf', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'uint256' }], outputs: [{ type: 'address' }] },
  { name: 'isApprovedForAll', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'address' }, { name: '', type: 'address' }], outputs: [{ type: 'bool' }] },
  { name: 'setApprovalForAll', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '', type: 'address' }, { name: '', type: 'bool' }], outputs: [] },
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '', type: 'address' }, { name: '', type: 'uint256' }], outputs: [] },
  { name: 'getApproved', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'uint256' }], outputs: [{ type: 'address' }] },
  { name: 'transferFrom', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '', type: 'address' }, { name: '', type: 'address' }, { name: '', type: 'uint256' }], outputs: [] },
  { type: 'event', name: 'Transfer', inputs: [{ name: 'from', type: 'address', indexed: true }, { name: 'to', type: 'address', indexed: true }, { name: 'tokenId', type: 'uint256', indexed: true }] },
]
export const LAND_ABI = [
  ...ERC721_ABI,
  { name: 'encodeId', type: 'function', stateMutability: 'pure', inputs: [{ name: 'x', type: 'int16' }, { name: 'y', type: 'int16' }], outputs: [{ type: 'uint256' }] },
  { name: 'decodeId', type: 'function', stateMutability: 'pure', inputs: [{ name: 'id', type: 'uint256' }], outputs: [{ name: 'x', type: 'int16' }, { name: 'y', type: 'int16' }] },
  { name: 'resourceAttr', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'uint256' }], outputs: [{ type: 'uint80' }] },
  { name: 'getRate', type: 'function', stateMutability: 'view', inputs: [{ name: 'id', type: 'uint256' }, { name: 'res', type: 'uint8' }], outputs: [{ type: 'uint16' }] },
]
export const DRILL_ABI = [
  ...ERC721_ABI,
  { name: 'attrs', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'uint256' }], outputs: [{ name: 'tier', type: 'uint8' }, { name: 'affinity', type: 'uint8' }] },
]
export const APOSTLE_ABI = [
  ...ERC721_ABI,
  { name: 'attrs', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'uint256' }], outputs: [{ name: 'strength', type: 'uint8' }, { name: 'element', type: 'uint8' }] },
]
export const MINING_ABI = [
  { name: 'startMining', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'landId', type: 'uint256' }, { name: 'apostleId', type: 'uint256' }, { name: 'drillId', type: 'uint256' }], outputs: [] },
  { name: 'stopMining', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'landId', type: 'uint256' }, { name: 'apostleId', type: 'uint256' }], outputs: [] },
  { name: 'claim', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'landId', type: 'uint256' }], outputs: [] },
  { name: 'pendingRewards', type: 'function', stateMutability: 'view', inputs: [{ name: 'landId', type: 'uint256' }], outputs: [{ type: 'uint256[5]' }] },
  { name: 'slotCount', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { name: 'slots', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'uint256' }, { name: '', type: 'uint256' }], outputs: [{ name: 'apostleId', type: 'uint256' }, { name: 'drillId', type: 'uint256' }, { name: 'startTime', type: 'uint256' }] },
]
export const AUCTION_ABI = [
  { name: 'createAuction', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '', type: 'uint256' }, { name: '', type: 'uint128' }, { name: '', type: 'uint128' }, { name: '', type: 'uint64' }], outputs: [] },
  { name: 'bid', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '', type: 'uint256' }, { name: '', type: 'uint256' }], outputs: [] },
  { name: 'cancelAuction', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '', type: 'uint256' }], outputs: [] },
  { name: 'currentPrice', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { name: 'auctions', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'uint256' }], outputs: [{ name: 'seller', type: 'address' }, { name: 'startPrice', type: 'uint128' }, { name: 'endPrice', type: 'uint128' }, { name: 'duration', type: 'uint64' }, { name: 'startedAt', type: 'uint64' }] },
  { type: 'event', name: 'AuctionCreated', inputs: [{ name: 'id', type: 'uint256', indexed: true }, { name: 'seller', type: 'address', indexed: false }, { name: 'start', type: 'uint128', indexed: false }, { name: 'end', type: 'uint128', indexed: false }, { name: 'duration', type: 'uint64', indexed: false }] },
]
