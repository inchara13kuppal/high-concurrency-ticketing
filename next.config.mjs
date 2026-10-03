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
};

export default nextConfig;