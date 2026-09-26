/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['10.65.103.145'],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "www.themoviedb.org",
        pathname: "/assets/**",
      },
    ],
  },
};

export default nextConfig;
