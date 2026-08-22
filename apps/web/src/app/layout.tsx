import type { Metadata } from "next";
import { Sora, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "../components/Providers";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Merit Circle — Trustless Web3 Savings Protocol",
  description: "Web3 ROSCA (Arisan) berbasis reputasi — automasi iuran, kelola yield, tumbuhkan portofolio.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${sora.variable} ${jetbrainsMono.variable} bg-background text-on-surface font-body-md antialiased`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}