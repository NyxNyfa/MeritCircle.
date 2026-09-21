import React from "react";
import "../../../../packages/ui/src/theme.css";
import { GlassFilter } from "../components/ui/liquid-glass-card";

export const metadata = {
  title: "Merit Circle — Decentralized ROSCA on BNB Testnet",
  description: "Reputation-driven decentralized rotating savings and credit association without KYC or collateral.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" type="image/png" href="/logo.png" />
        <title>{metadata.title}</title>
      </head>
      <body className="mc-bg-dots">
        <GlassFilter />
        {children}
      </body>
    </html>
  );
}
