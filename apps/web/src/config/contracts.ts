// apps/web/src/config/contracts.ts

// Bersihkan kutipan ekstra ("/') + whitespace agar selalu berupa hex murni.
// Mencegah bug: Address '"0xcF7...Fc9"' is invalid (kutipan ganda terbawa).
const normalizeAddress = (value: string): `0x${string}` => {
  const cleaned = value.trim().replace(/^["']+|["']+$/g, "");
  if (!/^0x[a-fA-F0-9]{40}$/.test(cleaned)) {
    throw new Error(`Invalid contract address: "${value}"`);
  }
  return cleaned as `0x${string}`;
};

// ---------------------------------------------------------------------------
// Alamat kontrak PER-CHAIN.
// - 97    : BNB Smart Chain Testnet (target utama testnet MVP)
// - 31337 : Anvil lokal (development)
// Update alamat setelah setiap `forge script Deploy.s.sol` di chain terkait.
// ---------------------------------------------------------------------------
export type ContractAddresses = {
  mcToken: `0x${string}`;
  tokenSwap: `0x${string}` | null;
  meritPool: `0x${string}`;
};

export const CHAIN_CONTRACTS: Record<number, ContractAddresses> = {
  97: {
    // TODO: isi setelah deploy ulang ke BSC Testnet (butuh deployer ber-tBNB)
    mcToken: "0x0000000000000000000000000000000000000001" as `0x${string}`,
    tokenSwap: null,
    meritPool: "0x0000000000000000000000000000000000000002" as `0x${string}`,
  },
  31337: {
    // Alamat deterministik untuk Anvil fresh (deploy urutan nonce 0-2 via Deploy.s.sol).
    // Jika anvil TIDAK fresh, jalankan ulang forge script dan perbarui alamat di sini.
    mcToken: normalizeAddress("0x5FbDB2315678afecb367f032d93F642f64180aa3"),
    tokenSwap: normalizeAddress("0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"),
    meritPool: normalizeAddress("0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"),
  },
};

/** Alamat kontrak untuk chainId tertentu; fallback ke Anvil bila chain belum terdaftar. */
export function getContractAddresses(chainId?: number): ContractAddresses {
  if (chainId && CHAIN_CONTRACTS[chainId]) return CHAIN_CONTRACTS[chainId];
  return CHAIN_CONTRACTS[31337];
}

/** Alias kompatibel untuk pemakaian lama — SELALU utamakan getContractAddresses(useChainId()). */
export const MC_TOKEN_ADDRESS = getContractAddresses().mcToken;
export const TOKEN_SWAP_ADDRESS = getContractAddresses().tokenSwap;
export const MERIT_POOL_ADDRESS = getContractAddresses().meritPool;

// 2. ABI untuk Token MCircle (Disederhanakan untuk fungsi yang kita butuhkan)
export const MCIRCLE_ABI = [
  {
    "type": "function",
    "name": "balanceOf",
    "inputs": [{"name": "account", "type": "address"}],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "approve",
    "inputs": [
      {"name": "spender", "type": "address"},
      {"name": "value", "type": "uint256"}
    ],
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "allowance",
    "inputs": [
      {"name": "owner", "type": "address"},
      {"name": "spender", "type": "address"}
    ],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  }
] as const;

// 2b. ABI untuk TokenSwap — two-way swap (Beli/Jual MC pakai Native ETH/tBNB)
export const TOKEN_SWAP_ABI = [
  {
    "type": "function",
    "name": "swapBNBForMC",
    "inputs": [],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "swapMCForBNB",
    "inputs": [{"name": "mcAmount", "type": "uint256"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "withdrawBNB",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  }
] as const;

// 3. ABI MeritPool v2 (multi-pool + cycle scheduling + auction)
export const MERITPOOL_ABI = [
  {
    "type": "function",
    "name": "joinPool",
    "inputs": [
      {"name": "poolId", "type": "uint256"},
      {"name": "userTier", "type": "uint256"},
      {"name": "signature", "type": "bytes"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "contribute",
    "inputs": [{"name": "poolId", "type": "uint256"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "placeBid",
    "inputs": [
      {"name": "poolId", "type": "uint256"},
      {"name": "amount", "type": "uint256"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "designateWinner",
    "inputs": [
      {"name": "poolId", "type": "uint256"},
      {"name": "winner", "type": "address"},
      {"name": "signature", "type": "bytes"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "settleCycle",
    "inputs": [
      {"name": "poolId", "type": "uint256"},
      {"name": "fallbackWinner", "type": "address"},
      {"name": "fallbackSignature", "type": "bytes"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "lastWinner",
    "inputs": [{"name": "poolId", "type": "uint256"}],
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "currentCycle",
    "inputs": [{"name": "poolId", "type": "uint256"}],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hasContributed",
    "inputs": [
      {"name": "poolId", "type": "uint256"},
      {"name": "cycleId", "type": "uint256"},
      {"name": "user", "type": "address"}
    ],
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "cycleWinner",
    "inputs": [
      {"name": "poolId", "type": "uint256"},
      {"name": "round", "type": "uint256"},
      {"name": "cycle", "type": "uint256"}
    ],
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getCurrentMembersCount",
    "inputs": [{"name": "poolId", "type": "uint256"}],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getPoolState",
    "inputs": [{"name": "poolId", "type": "uint256"}],
    "outputs": [
      {"name": "status", "type": "uint8"},
      {"name": "round", "type": "uint256"},
      {"name": "activeCycle", "type": "uint256"},
      {"name": "deadline", "type": "uint256"},
      {"name": "collectedThisCycle", "type": "uint256"},
      {"name": "memberCount", "type": "uint256"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "minValidBid",
    "inputs": [{"name": "poolId", "type": "uint256"}],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getLowestBid",
    "inputs": [{"name": "poolId", "type": "uint256"}],
    "outputs": [
      {"name": "bidder", "type": "address"},
      {"name": "amount", "type": "uint256"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isSettleable",
    "inputs": [{"name": "poolId", "type": "uint256"}],
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getBidCount",
    "inputs": [{"name": "poolId", "type": "uint256"}],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pools",
    "inputs": [{"name": "poolId", "type": "uint256"}],
    "outputs": [
      {"name": "poolId", "type": "uint256"},
      {"name": "name", "type": "string"},
      {"name": "tierRequired", "type": "uint256"},
      {"name": "contributionAmount", "type": "uint256"},
      {"name": "maxMembers", "type": "uint256"},
      {"name": "totalCycles", "type": "uint256"},
      {"name": "cycleDuration", "type": "uint256"},
      {"name": "isAuctionMode", "type": "bool"},
      {"name": "maxDiscountBps", "type": "uint256"}
    ],
    "stateMutability": "view"
  }
] as const;