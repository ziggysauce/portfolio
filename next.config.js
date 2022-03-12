/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.pexels.com', 'image.ibb.co'],
  },
  typescript: {
    ignoreBuildErrors: true, // FIXME: JUST FOR NOW
  },
}

module.exports = nextConfig
