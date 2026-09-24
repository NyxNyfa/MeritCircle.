/**
 * Merit Circle Web3 Wallet Integration
 * Implements EIP-1193 provider handling for BNB Smart Chain Testnet.
 */

import { getErrorMessage } from "./error";

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

export type WalletTransactionErrorCode =
  | "USER_REJECTED"
  | "ONCHAIN_REVERTED"
  | "RECEIPT_PENDING"
  | "WALLET_REQUEST_PENDING"
  | "RECEIPT_MISMATCH"
  | "WALLET_TRANSACTION_FAILED";

export class WalletTransactionError extends Error {
  constructor(
    public readonly code: WalletTransactionErrorCode,
    message: string,
    public readonly txHash?: string
  ) {
    super(message);
    this.name = "WalletTransactionError";
  }
}

export interface WalletTransactionReceipt {
  transactionHash: string;
  status: "success";
  blockNumber?: string;
}

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

function isUserRejection(error: any): boolean {
  const code = error?.code;
  const message = String(error?.message || error || "").toLowerCase();
  return (
    code === 4001 ||
    code === "ACTION_REJECTED" ||
    message.includes("user rejected") ||
    message.includes("user denied") ||
    message.includes("rejected by user") ||
    message.includes("denied transaction")
  );
}

function normalizeWalletError(error: unknown): WalletTransactionError {
  if (error instanceof WalletTransactionError) return error;
  if (isUserRejection(error)) {
    return new WalletTransactionError(
      "USER_REJECTED",
      "Transaksi dibatalkan oleh pengguna. Tidak ada pembayaran yang dicatat."
    );
  }
  const message = getErrorMessage(error);
  return new WalletTransactionError(
    "WALLET_TRANSACTION_FAILED",
    `Transaksi tidak dapat dikirim dari dompet Web3: ${message}`
  );
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(
      () =>
        reject(
          new WalletTransactionError(
            "WALLET_REQUEST_PENDING",
            "Permintaan transaksi tidak selesai. Periksa kembali dompet Web3 sebelum mencoba ulang."
          )
        ),
      timeoutMs
    );
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}

export async function waitForTransactionReceipt(
  txHash: string,
  options: { timeoutMs?: number; pollIntervalMs?: number } = {}
): Promise<WalletTransactionReceipt> {
  if (!isEthereumAvailable()) {
    throw new Error("No Web3 wallet detected.");
  }

  const timeoutMs = options.timeoutMs ?? 180_000;
  const pollIntervalMs = options.pollIntervalMs ?? 2_000;
  const normalizedHash = txHash.toLowerCase();
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const receipt = await window.ethereum!.request({
      method: "eth_getTransactionReceipt",
      params: [normalizedHash],
    });

    if (receipt) {
      if (
        receipt.transactionHash &&
        String(receipt.transactionHash).toLowerCase() !== normalizedHash
      ) {
        throw new WalletTransactionError(
          "RECEIPT_MISMATCH",
          "Receipt yang diterima tidak cocok dengan hash transaksi yang dikirim.",
          normalizedHash
        );
      }

      const status = String(receipt.status || "").toLowerCase();
      if (status === "0x1" || status === "1") {
        return {
          transactionHash: normalizedHash,
          status: "success",
          blockNumber: receipt.blockNumber,
        };
      }
      if (status === "0x0" || status === "0") {
        throw new WalletTransactionError(
          "ONCHAIN_REVERTED",
          "Transaksi on-chain gagal/revert. Tidak ada pembayaran yang dicatat.",
          normalizedHash
        );
      }
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new WalletTransactionError(
    "RECEIPT_PENDING",
    "Transaksi sudah disiarkan tetapi receipt belum tersedia. Status belum dapat diverifikasi; jangan mengulang pembayaran sebelum memeriksa hash.",
    normalizedHash
  );
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

  try {
    const currentChain = await getCurrentChainId();
    if (currentChain !== BNB_TESTNET_CHAIN_ID) {
      await switchToBnbTestnet();
    }

    const txHash = await withTimeout(
      window.ethereum!.request({
        method: "eth_sendTransaction",
        params: [
          {
            to: params.to,
            from: params.from,
            data: params.data,
            value: params.value ? `0x${BigInt(params.value).toString(16)}` : "0x0",
          },
        ],
      }) as Promise<string>,
      180_000
    );

    if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
      throw new WalletTransactionError(
        "WALLET_TRANSACTION_FAILED",
        "Dompet mengembalikan hash transaksi yang tidak valid."
      );
    }
    return txHash.toLowerCase();
  } catch (error) {
    throw normalizeWalletError(error);
  }
}
