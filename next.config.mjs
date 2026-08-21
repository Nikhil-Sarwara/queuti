/** @type {import('next').NextConfig} */
const nextConfig = {
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