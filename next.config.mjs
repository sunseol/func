/** @type {import('next').NextConfig} */
const nextConfig = {
  // 환경 변수 설정
  env: {
    NEXT_PUBLIC_GROQ_API_KEY: process.env.NEXT_PUBLIC_GROQ_API_KEY,
  },
  
  // 성능 최적화 설정
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@heroicons/react'],
  },
  
  // 이미지 최적화 설정
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // 압축 설정
  compress: true,
  
  // 캐싱 설정
  headers: async () => {
    return [
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, stale-while-revalidate=600',
          },
        ],
      },
      {
        source: '/(.*).css',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/(.*).js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/images/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  ...(!process.env.TURBOPACK && {
    webpack: (config, { isServer }) => {
      // 트리 쉐이킹 최적화
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
      };
      
      return config;
    },
  }),
  
  // PoweredByHeader 비활성화 (보안)
  poweredByHeader: false,
  
  // TypeScript 에러 무시 (개발 중)
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // ESLint 에러 무시 (개발 중)  
  eslint: {
    ignoreDuringBuilds: true,
  },

  // 개발 환경 설정
  ...(process.env.NODE_ENV === 'development' && {
    reactStrictMode: false,
  }),
};

export default nextConfig;
