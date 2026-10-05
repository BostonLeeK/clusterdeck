import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

loadEnvConfig(path.join(path.dirname(fileURLToPath(import.meta.url)), "../.."));

const nextConfig: NextConfig = {
  transpilePackages: ["@dataflow/db", "@dataflow/shared"],
  serverExternalPackages: ["postgres", "@node-rs/argon2"],
};

export default nextConfig;
