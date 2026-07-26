/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    const targetBackend = process.env.NEXT_PUBLIC_API_URL || 'https://codeviit-backend.vercel.app'
    const cleanTarget = targetBackend.replace(/\/+$/, '')
    return [
      {
        source: '/api/:path*',
        destination: `${cleanTarget}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
