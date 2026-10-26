import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingExcludes: {"/*": ["./.local-platform/**/*", "./content/drafts/**/*", "./.env*"]},
  async headers() {
    return [{source:"/:path*",headers:[{key:"X-Content-Type-Options",value:"nosniff"},{key:"X-Frame-Options",value:"DENY"},{key:"Referrer-Policy",value:"no-referrer"}]},{source:"/api/:path*",headers:[{key:"Cache-Control",value:"private, no-store"}]},{ source: "/images/blog/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] }];
  },
};

export default nextConfig;
