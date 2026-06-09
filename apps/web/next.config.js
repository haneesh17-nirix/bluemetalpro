/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export — works with Azure Static Web Apps Free tier.
  // The app is a pure client-side SPA; all data is fetched via
  // the backend API (NEXT_PUBLIC_API_URL).
  output: 'export',
  trailingSlash: true,           // /dashboard → /dashboard/index.html
  images: { unoptimized: true }, // required for static export (no image optimisation server)
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
};

module.exports = nextConfig;
