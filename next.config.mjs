/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://fulltime.thefa.com",
              "style-src 'self' 'unsafe-inline' https://fulltime.thefa.com https://cdn.thefa.com",
              "img-src 'self' data: blob: https://fulltime.thefa.com https://cdn.thefa.com",
              "font-src 'self' data: https://fulltime.thefa.com https://cdn.thefa.com",
              "connect-src 'self' https://api.stripe.com https://fulltime.thefa.com",
              "frame-src https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
              "object-src 'none'",
              "base-uri 'none'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig; 