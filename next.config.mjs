/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: [
    "antd",
    "@ant-design/x",
    "@ant-design/x-markdown",
    "@ant-design/icons",
    "@ant-design/icons-svg",
    "rc-util",
  ],
  experimental: {
    optimizePackageImports: [
      "antd",
      "@ant-design/x",
      "@ant-design/x-markdown",
    ],
  },
};

export default nextConfig;
