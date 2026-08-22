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

// 1. Alamat Contract (Anvil local — chainId 31337)
// NOTE: alamat bergeser karena nonce deployer sudah terpakai saat re-deploy terakhir.
export const MC_TOKEN_ADDRESS = normalizeAddress("0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512");
export const TOKEN_SWAP_ADDRESS = normalizeAddress("0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0");
export const MERIT_POOL_ADDRESS = normalizeAddress("0xcF7ed3acca5A467e9e704C703E8D87f634fB0Fc9");

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

// 3. ABI untuk MeritPool Arisan (multi-pool: 6 pool + lastWinner + currentCycle)
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
    "name": "hasJoined",
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
    "name": "getCurrentMembersCount",
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
      {"name": "totalYield", "type": "uint256"},
      {"name": "isAuctionMode", "type": "bool"}
    ],
    "stateMutability": "view"
  }
] as const;