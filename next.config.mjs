/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // iCloud/동기화 폴더에서 webpack 파일 캐시가 깨지면 / 와 /_next/static 404가 날 수 있음
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
