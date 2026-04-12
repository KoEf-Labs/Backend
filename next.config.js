/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    instrumentationHook: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Sentry + OpenTelemetry auto-instrumentation uses dynamic require()
      // which webpack can't statically analyze. The warnings are cosmetic —
      // runtime works fine and Sentry still captures errors.
      config.ignoreWarnings = [
        ...(config.ignoreWarnings || []),
        { module: /node_modules\/@opentelemetry\/instrumentation/ },
        { module: /node_modules\/@prisma\/instrumentation/ },
        { module: /node_modules\/@fastify\/otel/ },
        { module: /node_modules\/require-in-the-middle/ },
      ];
    }
    return config;
  },
};

module.exports = nextConfig;
