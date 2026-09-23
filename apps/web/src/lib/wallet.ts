/**
 * Merit Circle Web3 Wallet Integration
 * Implements EIP-1193 provider handling for BNB Smart Chain Testnet.
 */

export const BNB_TESTNET_CHAIN_ID = 97;
export const BNB_TESTNET_CHAIN_ID_HEX = "0x61";

export const BNB_TESTNET_PARAMS = {
  chainId: BNB_TESTNET_CHAIN_ID_HEX,
  chainName: "BNB Smart Chain Testnet",
  nativeCurrency: {
    name: "tBNB",
    symbol: "tBNB",
    decimals: 18,
  },
  rpcUrls: [
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_BNB_TESTNET_RPC_URL) ||
      "https://data-seed-prebsc-1-s1.binance.org:8545",
  ],
  blockExplorerUrls: ["https://testnet.bscscan.com"],
};

export interface WalletState {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

// Window Ethereum interface augmentation
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<any>;
      on?: (event: string, callback: (...args: any[]) => void) => void;
      removeListener?: (event: string, callback: (...args: any[]) => void) => void;
    };
  }
}

export function isEthereumAvailable(): boolean {
  return typeof window !== "undefined" && Boolean(window.ethereum);
}

export function isBnbTestnet(chainId: number | null | undefined): boolean {
  return chainId === BNB_TESTNET_CHAIN_ID;
}

export async function connectWallet(): Promise<{ address: string; chainId: number }> {
  if (!isEthereumAvailable()) {
    throw new Error("No Web3 wallet detected. Please install MetaMask, Rabby, or Binance Wallet.");
  }

  const accounts = (await window.ethereum!.request({
    method: "eth_requestAccounts",
  })) as string[];

  if (!accounts || accounts.length === 0) {
    throw new Error("No accounts authorized.");
  }

  const address = accounts[0].toLowerCase();

  const chainIdHex = (await window.ethereum!.request({
    method: "eth_chainId",
  })) as string;

  const chainId = parseInt(chainIdHex, 16);

  return { address, chainId };
}

export async function getWalletAddress(): Promise<string | null> {
  if (!isEthereumAvailable()) return null;

  try {
    const accounts = (await window.ethereum!.request({
      method: "eth_accounts",
    })) as string[];

    return accounts && accounts.length > 0 ? accounts[0].toLowerCase() : null;
  } catch {
    return null;
  }
}

export async function getCurrentChainId(): Promise<number | null> {
  if (!isEthereumAvailable()) return null;

  try {
    const chainIdHex = (await window.ethereum!.request({
      method: "eth_chainId",
    })) as string;

    return parseInt(chainIdHex, 16);
  } catch {
    return null;
  }
}

export async function switchToBnbTestnet(): Promise<void> {
  if (!isEthereumAvailable()) {
    throw new Error("No Web3 wallet detected.");
  }

  try {
    await window.ethereum!.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BNB_TESTNET_CHAIN_ID_HEX }],
    });
  } catch (switchError: any) {
    // 4902 error code indicates the chain has not been added to MetaMask
    if (switchError?.code === 4902) {
      await window.ethereum!.request({
        method: "wallet_addEthereumChain",
        params: [BNB_TESTNET_PARAMS],
      });
    } else {
      throw switchError;
    }
  }
}

export async function signMessage(message: string, address: string): Promise<string> {
  if (!isEthereumAvailable()) {
    throw new Error("No Web3 wallet detected.");
  }

  const signature = (await window.ethereum!.request({
    method: "personal_sign",
    params: [message, address],
  })) as string;

  return signature;
}

export async function sendContractTransaction(params: {
  to: string;
  from: string;
  data: string;
  value?: string;
}): Promise<string> {
  if (!isEthereumAvailable()) {
    throw new Error("No Web3 wallet detected. Silakan pasang MetaMask atau Rabby.");
  }

  // Ensure wallet is on BNB Smart Chain Testnet (Chain ID 97)
  const currentChain = await getCurrentChainId();
  if (currentChain !== BNB_TESTNET_CHAIN_ID) {
    await switchToBnbTestnet();
  }

  const txPromise = window.ethereum!.request({
    method: "eth_sendTransaction",
    params: [
      {
        to: params.to,
        from: params.from,
        data: params.data,
        value: params.value ? `0x${BigInt(params.value).toString(16)}` : "0x0",
      },
    ],
  }) as Promise<string>;

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () =>
        reject(
          new Error("Permintaan transaksi kedaluwarsa (timeout 3 menit). Silakan periksa notifikasi ekstensi dompet Web3 Anda.")
        ),
      180000
    )
  );

  const txHash = await Promise.race([txPromise, timeoutPromise]);
  return txHash;
}
