import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["openreply.vps12022.panel.icontainer.work"],
  reactCompiler: true,
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
