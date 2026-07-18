import type { NextConfig } from "next";

// standalone: build gera um servidor mínimo com só as deps rastreadas, ideal
// pra imagem Docker enxuta. Num monorepo, o server sai em .next/standalone/apps/web.
const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
