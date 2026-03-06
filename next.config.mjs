// import path from 'path'
// import { fileURLToPath } from 'url'

// const __dirname = path.dirname(fileURLToPath(import.meta.url))

// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   typescript: {
//     ignoreBuildErrors: true,
//   },
//   turbopack: {
//     root: __dirname,
//   },
//   images: {
//     unoptimized: true,
//   },
// }

// export default nextConfig

import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    root: __dirname,
  },
  images: {
    unoptimized: true,
  },

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://34.227.190.214:8000/:path*",
      },
    ]
  },
}

export default nextConfig