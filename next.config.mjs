
/** @type {import('next').NextConfig} */
const allowedDevOrigins = new Set([
  "127.0.0.1",
  "localhost",
  "*.replit.dev",
  "*.replit.app",
  "*.repl.co",
]);

if (process.env.REPLIT_DEV_DOMAIN) {
  allowedDevOrigins.add(process.env.REPLIT_DEV_DOMAIN);
}

const nextConfig = {
  allowedDevOrigins: [...allowedDevOrigins],
  devIndicators: {
    buildActivity: false,
  },
  // Bypass TypeScript/ESLint errors during builds
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
