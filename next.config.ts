import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Serve images directly from S3/CloudFront instead of the runtime image
  // optimizer Lambda (avoids the OpenNext sharp-on-Lambda 500s). Fine for this
  // app — it only uses a logo and user-uploaded proof images.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
