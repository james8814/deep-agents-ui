import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",

  // Ant Design X 配置
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
