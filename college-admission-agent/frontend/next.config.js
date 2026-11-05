/** @type {import('next').NextConfig} */
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Only proxy /api/* → backend when the API URL is NOT on the same origin
// (i.e. skip the rewrite on IBM Cloud where frontend and backend are separate services
//  and the frontend calls the backend URL directly from the browser).
const isLocalProxy = API_URL.includes("localhost") || API_URL.includes("127.0.0.1");

const nextConfig = {
  reactStrictMode: true,
  output: "standalone",   // required for Docker multi-stage build
  async rewrites() {
    if (!isLocalProxy) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${API_URL}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
