/** @type {import('next').NextConfig} */
const nextConfig = {
  // Security headers (#25) — applied to every response (pages + API).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            // Pragmatic CSP: 'unsafe-inline' is required by Next's inline
            // bootstrap scripts; connect-src https: lets Transformers.js load
            // model weights from CDNs. Tighten once streaming/ML allow it.
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https:",
              "worker-src 'self' blob:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // Transformers.js only needs onnxruntime-web in the browser. Alias the
    // native onnxruntime-node module out so webpack doesn't try to parse
    // (and blow up on) its platform binaries. The client-side dynamic
    // import in lib/ml.ts resolves to onnxruntime-web via the package's
    // own browser field, which is what runs in the user's browser.
    config.resolve.alias = {
      ...config.resolve.alias,
      "onnxruntime-node": false,
    };
    return config;
  },
};
export default nextConfig;