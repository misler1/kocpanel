import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['recess-upstage-kindness.ngrok-free.dev'],
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'kocpanell.vercel.app',
          },
        ],
        destination: 'https://kocdefterim.com.tr/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;