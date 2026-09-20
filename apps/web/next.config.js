/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@merit-circle/ui", "@merit-circle/domain"],
  agentRules: false,
};

module.exports = nextConfig;
