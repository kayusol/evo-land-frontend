import React, { useState } from 'react'
import { useWalletClient, usePublicClient } from 'wagmi'
import { parseEther, encodeFunctionData } from 'viem'
import { CONTRACTS, RESOURCE_TOKENS, PANCAKE_ROUTER, WBNB } from '../constants/contracts.js'
import './AdminPage.css'

// ─── ABIs (inline minimal) ────────────────────────────────────
const INIT_ABI = [
  { name: 'batchMint', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'xs', type: 'int16[]' },
      { name: 'ys', type: 'int16[]' },
      { name: 'attrs', type: 'uint80[]' },
    ], outputs: [] },
]
const APOSTLE_ABI = [
  { name: 'mint', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'to', type: 'address' }, { name: 'strength', type: 'uint8' }, { name: 'element', type: 'uint8' }],
    outputs: [{ type: 'uint256' }] },
  { name: 'setApprovalForAll', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'operator', type: 'address' }, { name: 'approved', type: 'bool' }], outputs: [] },
  { name: 'nextId', type: 'function', stateMutability: 'view',
    inputs: [], outputs: [{ type: 'uint256' }] },
]
const DRILL_ABI = [
  { name: 'mint', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'to', type: 'address' }, { name: 'tier', type: 'uint8' }, { name: 'affinity', type: 'uint8' }],
    outputs: [{ type: 'uint256' }] },
  { name: 'setApprovalForAll', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'operator', type: 'address' }, { name: 'approved', type: 'bool' }], outputs: [] },
  { name: 'nextId', type: 'function', stateMutability: 'view',
    inputs: [], outputs: [{ type: 'uint256' }] },
]
const LAND_ABI = [
  { name: 'setApprovalForAll', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'operator', type: 'address' }, { name: 'approved', type: 'bool' }], outputs: [] },
  { name: 'isApprovedForAll', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'operator', type: 'address' }],
    outputs: [{ type: 'bool' }] },
]
const MINING_ABI = [
  { name: 'startMining', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'landId', type: 'uint256' }, { name: 'apostleId', type: 'uint256' }, { name: 'drillId', type: 'uint256' }],
    outputs: [] },
]
const AUCTION_ABI = [
  { name: 'createAuction', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'id', type: 'uint256' },
      { name: 'startPrice', type: 'uint128' },
      { name: 'endPrice', type: 'uint128' },
      { name: 'duration', type: 'uint64' },
    ], outputs: [] },
]
const ERC20_ABI = [
  { name: 'approve', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ type: 'bool' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'setMinter', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'minter', type: 'address' }, { name: 'enabled', type: 'bool' }], outputs: [] },
  { name: 'mint', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
]
const ROUTER_ABI = [
  { name: 'addLiquidity', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenA', type: 'address' }, { name: 'tokenB', type: 'address' },
      { name: 'amountADesired', type: 'uint256' }, { name: 'amountBDesired', type: 'uint256' },
      { name: 'amountAMin', type: 'uint256' }, { name: 'amountBMin', type: 'uint256' },
      { name: 'to', type: 'address' }, { name: 'deadline', type: 'uint256' },
    ], outputs: [{ type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }] },
  { name: 'addLiquidityETH', type: 'function', stateMutability: 'payable',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'amountTokenDesired', type: 'uint256' },
      { name: 'amountTokenMin', type: 'uint256' },
      { name: 'amountETHMin', type: 'uint256' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ], outputs: [{ type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }] },
]

// ─── encode attr ──────────────────────────────────────────────
function encodeAttr(g, w, wa, f, s) {
  return (
    BigInt(g) | (BigInt(w) << 16n) | (BigInt(wa) << 32n) |
    (BigInt(f) << 48n) | (BigInt(s) << 64n)
  )
}

// ─── helpers ──────────────────────────────────────────────────
async function sendTx(walletClient, publicClient, { address, abi, functionName, args, value }) {
  const { request } = await publicClient.simulateContract({
    address, abi, functionName, args,
    account: walletClient.account,
    ...(value ? { value } : {}),
  })
  const hash = await walletClient.writeContract(request)
  await publicClient.waitForTransactionReceipt({ hash })
  return hash
}

// ─── Component ────────────────────────────────────────────────
export default function AdminPage() {
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const [logs, setLogs] = useState([])
  const [running, setRunning] = useState(false)

  function log(msg, type = 'info') {
    setLogs(prev => [...prev, { msg, type, time: new Date().toLocaleTimeString() }])
  }

  async function runInit() {
    if (!walletClient) { alert('请先连接钱包！'); return }
    setRunning(true)
    setLogs([])
    const account = walletClient.account.address

    try {
      // ── STEP 1: Mint 20 lands ────────────────────────────────
      log('🌍 [1/6] 铸造 20 块土地...')
      const xs = [], ys = [], attrs = []
      for (let i = 0; i < 20; i++) {
        xs.push(i); ys.push(0)
        const s = i * 137
        attrs.push(encodeAttr(
          (s * 3  + 10) % 100 + 5,
          (s * 7  + 20) % 100 + 5,
          (s * 11 + 30) % 100 + 5,
          (s * 13 + 40) % 100 + 5,
          (s * 17 + 50) % 100 + 5,
        ))
      }
      await sendTx(walletClient, publicClient, {
        address: CONTRACTS.initializer,
        abi: INIT_ABI,
        functionName: 'batchMint',
        args: [xs, ys, attrs],
      })
      log('✅ 20 块土地铸造完成', 'success')

      // ── STEP 2: Mint 10 apostles ─────────────────────────────
      log('🧙 [2/6] 铸造 10 个使徒...')
      const apostleIds = []
      for (let i = 0; i < 10; i++) {
        const strength = 30 + i * 7
        const element  = i % 5
        await sendTx(walletClient, publicClient, {
          address: CONTRACTS.apostle,
          abi: APOSTLE_ABI,
          functionName: 'mint',
          args: [account, strength, element],
        })
        apostleIds.push(i + 1)
        log(`  使徒 #${i+1}: 力量=${strength} 元素=${['金','木','水','火','土'][element]}`, 'success')
      }

      // ── STEP 3: Mint 10 drills ───────────────────────────────
      log('⛏️ [3/6] 铸造 10 个钻头...')
      const drillIds = []
      for (let i = 0; i < 10; i++) {
        const tier     = (i % 5) + 1
        const affinity = i % 5
        await sendTx(walletClient, publicClient, {
          address: CONTRACTS.drill,
          abi: DRILL_ABI,
          functionName: 'mint',
          args: [account, tier, affinity],
        })
        drillIds.push(i + 1)
        log(`  钻头 #${i+1}: ${'★'.repeat(tier)} 亲和=${['金','木','水','火','土'][affinity]}`, 'success')
      }

      // ── STEP 4: Approve mining + startMining for land 1-5 ───
      log('⚒️ [4/6] 地块 1-5 开启挖矿...')
      await sendTx(walletClient, publicClient, {
        address: CONTRACTS.apostle, abi: APOSTLE_ABI,
        functionName: 'setApprovalForAll', args: [CONTRACTS.mining, true],
      })
      await sendTx(walletClient, publicClient, {
        address: CONTRACTS.drill, abi: DRILL_ABI,
        functionName: 'setApprovalForAll', args: [CONTRACTS.mining, true],
      })
      await sendTx(walletClient, publicClient, {
        address: CONTRACTS.land, abi: LAND_ABI,
        functionName: 'setApprovalForAll', args: [CONTRACTS.mining, true],
      })
      for (let i = 0; i < 5; i++) {
        try {
          await sendTx(walletClient, publicClient, {
            address: CONTRACTS.mining, abi: MINING_ABI,
            functionName: 'startMining',
            args: [BigInt(i + 1), BigInt(i + 1), BigInt(i + 1)],
          })
          log(`  ✅ 地块 #${i+1} 挖矿中（使徒#${i+1} + 钻头#${i+1}）`, 'success')
        } catch (e) {
          log(`  ⚠️ 地块 #${i+1} 挖矿失败: ${e.shortMessage || e.message}`, 'warn')
        }
      }

      // ── STEP 5: Auction land 6-10 ────────────────────────────
      log('🏛 [5/6] 地块 6-10 挂拍卖...')
      await sendTx(walletClient, publicClient, {
        address: CONTRACTS.land, abi: LAND_ABI,
        functionName: 'setApprovalForAll', args: [CONTRACTS.auction, true],
      })
      await sendTx(walletClient, publicClient, {
        address: CONTRACTS.ring, abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACTS.auction, parseEther('100000')],
      })
      const startPrices = [10n, 8n, 12n, 6n, 15n]
      const endPrices   = [2n,  1n,  3n, 1n,  2n]
      const DURATION    = BigInt(3 * 24 * 3600)
      for (let i = 0; i < 5; i++) {
        try {
          await sendTx(walletClient, publicClient, {
            address: CONTRACTS.auction, abi: AUCTION_ABI,
            functionName: 'createAuction',
            args: [
              BigInt(i + 6),
              parseEther(startPrices[i].toString()),
              parseEther(endPrices[i].toString()),
              DURATION,
            ],
          })
          log(`  ✅ 地块 #${i+6} 挂拍 ${startPrices[i]}→${endPrices[i]} RING (3天)`, 'success')
        } catch (e) {
          log(`  ⚠️ 地块 #${i+6} 挂拍失败: ${e.shortMessage || e.message}`, 'warn')
        }
      }

      // ── STEP 6: Add LP ───────────────────────────────────────
      log('💧 [6/6] 添加流动性...')
      const RING_PER_PAIR = parseEther('200')
      const RES_PER_PAIR  = parseEther('1000')
      const resAddrs = [CONTRACTS.gold, CONTRACTS.wood, CONTRACTS.water, CONTRACTS.fire, CONTRACTS.soil]
      const resNames = ['GOLD','WOOD','HHO','FIRE','SIOO']
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800)

      // Approve RING for router (all pairs)
      await sendTx(walletClient, publicClient, {
        address: CONTRACTS.ring, abi: ERC20_ABI,
        functionName: 'approve',
        args: [PANCAKE_ROUTER, parseEther('5000')],
      })

      for (let i = 0; i < resAddrs.length; i++) {
        try {
          // Set deployer as minter for resource token
          await sendTx(walletClient, publicClient, {
            address: resAddrs[i], abi: ERC20_ABI,
            functionName: 'setMinter', args: [account, true],
          })
          // Mint resource tokens
          await sendTx(walletClient, publicClient, {
            address: resAddrs[i], abi: ERC20_ABI,
            functionName: 'mint', args: [account, RES_PER_PAIR],
          })
          // Approve resource token
          await sendTx(walletClient, publicClient, {
            address: resAddrs[i], abi: ERC20_ABI,
            functionName: 'approve', args: [PANCAKE_ROUTER, RES_PER_PAIR],
          })
          // Add liquidity
          await sendTx(walletClient, publicClient, {
            address: PANCAKE_ROUTER, abi: ROUTER_ABI,
            functionName: 'addLiquidity',
            args: [
              CONTRACTS.ring, resAddrs[i],
              RING_PER_PAIR, RES_PER_PAIR,
              0n, 0n,
              account, deadline,
            ],
          })
          log(`  ✅ RING-${resNames[i]} 流动性添加成功`, 'success')
        } catch (e) {
          log(`  ⚠️ RING-${resNames[i]} LP 失败: ${e.shortMessage || e.message}`, 'warn')
        }
      }

      // Mint RING for BNB pair
      try {
        const RING_FOR_BNB = parseEther('100')
        const BNB_VALUE    = parseEther('0.05')
        // Approve RING for BNB pair
        await sendTx(walletClient, publicClient, {
          address: CONTRACTS.ring, abi: ERC20_ABI,
          functionName: 'approve', args: [PANCAKE_ROUTER, RING_FOR_BNB],
        })
        await sendTx(walletClient, publicClient, {
          address: PANCAKE_ROUTER, abi: ROUTER_ABI,
          functionName: 'addLiquidityETH',
          args: [CONTRACTS.ring, RING_FOR_BNB, 0n, 0n, account, deadline],
          value: BNB_VALUE,
        })
        log('  ✅ RING-BNB 流动性添加成功', 'success')
      } catch (e) {
        log(`  ⚠️ RING-BNB LP 失败: ${e.shortMessage || e.message}`, 'warn')
      }

      log('🎉 全部初始化完成！刷新页面查看地图、市场和兑换数据。', 'success')
    } catch (err) {
      log(`❌ 错误: ${err.shortMessage || err.message}`, 'error')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>🛠 管理员初始化</h1>
        <p className="admin-desc">一键完成：铸造20块土地 + 10个使徒 + 10个钻头 + 开挖矿 + 挂拍卖 + 添加6个LP池</p>
        <div className="admin-warning">⚠️ 仅限部署者钱包操作，需要 BSC 测试网</div>
      </div>

      <div className="admin-steps">
        {[
          ['🌍', '铸造 20 块土地 (LandInitializer.batchMint)'],
          ['🧙', '铸造 10 个使徒 NFT'],
          ['⛏️', '铸造 10 个钻头 NFT'],
          ['⚒️', '地块 1-5 各绑定使徒+钻头开挖矿'],
          ['🏛', '地块 6-10 挂拍卖 (荷兰拍 3天)'],
          ['💧', '添加 RING-GOLD/WOOD/HHO/FIRE/SIOO + RING-BNB 流动性'],
        ].map(([icon, desc], i) => (
          <div key={i} className="admin-step">
            <span className="step-num">{i + 1}</span>
            <span className="step-icon">{icon}</span>
            <span className="step-desc">{desc}</span>
          </div>
        ))}
      </div>

      <button
        className={`admin-run-btn ${running ? 'running' : ''}`}
        onClick={runInit}
        disabled={running}
      >
        {running ? '⏳ 初始化中...' : '🚀 开始初始化'}
      </button>

      {logs.length > 0 && (
        <div className="admin-log">
          <div className="log-title">执行日志</div>
          {logs.map((l, i) => (
            <div key={i} className={`log-line log-${l.type}`}>
              <span className="log-time">{l.time}</span>
              <span className="log-msg">{l.msg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
