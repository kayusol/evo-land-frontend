export const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address,address) view returns (uint256)',
  'function transfer(address,uint256) returns (bool)',
  'function approve(address,uint256) returns (bool)',
  'function transferFrom(address,address,uint256) returns (bool)',
]

export const ERC721_BASE = [
  'function balanceOf(address) view returns (uint256)',
  'function ownerOf(uint256) view returns (address)',
  'function isApprovedForAll(address,address) view returns (bool)',
  'function setApprovalForAll(address,bool)',
  'function approve(address,uint256)',
  'function getApproved(uint256) view returns (address)',
  'function transferFrom(address,address,uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
]

export const LAND_ABI = [
  ...ERC721_BASE,
  'function encodeId(int16,int16) view returns (uint256)',
  'function decodeId(uint256) view returns (int16,int16)',
  'function resourceAttr(uint256) view returns (uint80)',
  'function getRate(uint256,uint8) view returns (uint16)',
]

export const DRILL_ABI = [
  ...ERC721_BASE,
  'function attrs(uint256) view returns (uint8 tier, uint8 affinity)',
]

export const APOSTLE_ABI = [
  ...ERC721_BASE,
  'function attrs(uint256) view returns (uint8 strength, uint8 element)',
]

export const MINING_ABI = [
  'function startMining(uint256,uint256,uint256)',
  'function stopMining(uint256,uint256)',
  'function claim(uint256)',
  'function pendingRewards(uint256) view returns (uint256[5])',
  'function slotCount(uint256) view returns (uint256)',
  'function slots(uint256,uint256) view returns (uint256 apostleId, uint256 drillId, uint256 startTime)',
]

export const AUCTION_ABI = [
  'function createAuction(uint256,uint128,uint128,uint64)',
  'function bid(uint256,uint256)',
  'function cancelAuction(uint256)',
  'function currentPrice(uint256) view returns (uint256)',
  'function auctions(uint256) view returns (address seller, uint128 startPrice, uint128 endPrice, uint64 duration, uint64 startedAt)',
  'event AuctionCreated(uint256 indexed id, address seller, uint128 start, uint128 end, uint64 duration)',
  'event AuctionWon(uint256 indexed id, address buyer, uint256 price)',
]
