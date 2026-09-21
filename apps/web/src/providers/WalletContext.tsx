"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  connectWallet,
  getCurrentChainId,
  getWalletAddress,
  isBnbTestnet,
  isEthereumAvailable,
  switchToBnbTestnet,
  signMessage,
  BNB_TESTNET_CHAIN_ID,
} from "../lib/wallet";
import { getErrorMessage } from "../lib/error";

export interface WalletContextValue {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  isCorrectNetwork: boolean;
  error: string | null;
  connect: () => Promise<string | null>;
  disconnect: () => void;
  switchNetwork: () => Promise<void>;
  sign: (msg: string) => Promise<string>;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    if (!isEthereumAvailable()) return;
    try {
      const currentAddr = await getWalletAddress();
      const currentChain = await getCurrentChainId();
      setAddress(currentAddr);
      setChainId(currentChain);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    checkConnection();

    if (typeof window !== "undefined" && window.ethereum?.on) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          setAddress(null);
        } else {
          setAddress(accounts[0].toLowerCase());
        }
      };

      const handleChainChanged = (chainIdHex: string) => {
        setChainId(parseInt(chainIdHex, 16));
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        if (window.ethereum?.removeListener) {
          window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
          window.ethereum.removeListener("chainChanged", handleChainChanged);
        }
      };
    }
  }, [checkConnection]);

  const connect = async (): Promise<string | null> => {
    setIsConnecting(true);
    setError(null);
    try {
      const res = await connectWallet();
      setAddress(res.address);
      setChainId(res.chainId);
      return res.address;
    } catch (err: any) {
      setError(getErrorMessage(err));
      return null;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAddress(null);
    setChainId(null);
  };

  const switchNetwork = async () => {
    try {
      await switchToBnbTestnet();
      const currentChain = await getCurrentChainId();
      setChainId(currentChain);
    } catch (err: any) {
      setError(getErrorMessage(err));
      throw err;
    }
  };

  const sign = async (msg: string): Promise<string> => {
    if (!address) throw new Error("Wallet not connected");
    return signMessage(msg, address);
  };

  const isConnected = Boolean(address);
  const isCorrectNetwork = isBnbTestnet(chainId);

  return (
    <WalletContext.Provider
      value={{
        address,
        chainId,
        isConnected,
        isConnecting,
        isCorrectNetwork,
        error,
        connect,
        disconnect,
        switchNetwork,
        sign,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
