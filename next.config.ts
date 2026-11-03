import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // An unset NEXT_PUBLIC_ variable isn't inlined, which would leave the test sign-in check
  // to run in the browser and ship its code. Always defining it lets the build remove it (TEST-4).
  env: {
    NEXT_PUBLIC_TEST_SIGN_IN: process.env.NEXT_PUBLIC_TEST_SIGN_IN ?? "",
  },
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
