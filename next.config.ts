import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      ...(supabaseHost
        ? [{ protocol: "https" as const, hostname: supabaseHost }]
        : []),
      { protocol: "https" as const, hostname: "img.youtube.com" },
      { protocol: "https" as const, hostname: "i.ytimg.com" },
      // Curated free-licence cover imagery
      { protocol: "https" as const, hostname: "images.pexels.com" },
      { protocol: "https" as const, hostname: "images.unsplash.com" },
      // wger exercise images (open-source exercise database)
      { protocol: "https" as const, hostname: "wger.de" },
    ],
  },
};

export default nextConfig;
