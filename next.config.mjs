/** @type {import('next').NextConfig} */
const repo = process.env.GITHUB_REPOSITORY?.split("/")[1];
const isGithubCi = process.env.GITHUB_ACTIONS === "true";
/** GitHub Pages 프로젝트 사이트: /저장소이름/ — Actions 빌드에서만 적용 */
const basePath = isGithubCi && repo ? `/${repo}` : "";

const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
