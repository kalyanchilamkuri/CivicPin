/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'freesvg.org' }],
  },
  reactStrictMode: false, // Disables Strict Mode
}

export default nextConfig
