/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output bundles the server + dependencies into .next/standalone
  // which is what the Dockerfile copies — no node_modules install needed at runtime.
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.googleapis.com" },
      { protocol: "https", hostname: "**.openstreetmap.org" },
      { protocol: "https", hostname: "**.mapbox.com" },
      // Google Places Photo CDN — resolved by following the photo-reference
      // redirect server-side so no API key is embedded in client-facing URLs.
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
    ],
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    return config;
  },
};

export default nextConfig;
