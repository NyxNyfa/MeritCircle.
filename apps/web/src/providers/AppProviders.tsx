"use client";

import React from "react";
import { WalletProvider } from "./WalletContext";
import { AuthProvider } from "./AuthContext";

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <WalletProvider>
      <AuthProvider>{children}</AuthProvider>
    </WalletProvider>
  );
};
