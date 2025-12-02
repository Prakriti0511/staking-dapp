/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,

  webpack: (config) => {
    // Force wagmi + rainbowkit to use ethers v5
    config.resolve.alias = {
      ...config.resolve.alias,
      ethers: require.resolve("ethers@5.7.2"),
    };
    return config;
  },
};

module.exports = nextConfig;
