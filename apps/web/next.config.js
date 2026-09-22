/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@merit-circle/ui", "@merit-circle/domain"],
  agentRules: false,
  async rewrites() {
    return [
      {
        source: "/payment",
        destination: "/pay",
      },
      {
        source: "/payments",
        destination: "/pay",
      },
      {
        source: "/auctions",
        destination: "/auction",
      },
    ];
  },
};

module.exports = nextConfig;
