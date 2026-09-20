declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_API_URL?: string;
    NEXT_PUBLIC_APP_URL?: string;
    NEXT_PUBLIC_BNB_TESTNET_CHAIN_ID?: string;
    NEXT_PUBLIC_BNB_TESTNET_RPC_URL?: string;
    NEXT_PUBLIC_CONTRACT_ADDRESS?: string;
    NEXT_PUBLIC_DEMO_PAYMENT_MODE?: string;
    NODE_ENV?: "development" | "production" | "test";
  }
}

declare const process: {
  env: NodeJS.ProcessEnv;
};
