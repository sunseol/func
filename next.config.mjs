/** @type {import('next').NextConfig} */
const nextConfig = {
  // 환경 변수 설정
  env: {
    NEXT_PUBLIC_GROQ_API_KEY: process.env.NEXT_PUBLIC_GROQ_API_KEY,
  },

  // 성능 최적화 설정
  experimental: {
    optimizePackageImports: ['@heroicons/react', 'antd'],
    // 모바일 최적화를 위한 코드 스플리팅
    optimizeCss: true,
  },

  // 이미지 최적화 설정
  images: {
    // 최신 이미지 포맷 우선 사용 (AVIF > WebP > JPEG)
    formats: ['image/avif', 'image/webp'],

    // 모바일 최적화된 디바이스 크기
    deviceSizes: [
      320,  // 작은 모바일
      375,  // iPhone SE
      414,  // iPhone Plus
      640,  // 작은 태블릿
      750,  // iPhone 표준
      828,  // iPhone XR
      1080, // 태블릿
      1200, // 작은 데스크톱
      1920, // 데스크톱
      2048, // 큰 데스크톱
      3840  // 4K
    ],

    // 아이콘 및 작은 이미지 크기
    imageSizes: [16, 24, 32, 48, 64, 96, 128, 256, 384, 512],

    // 캐시 설정 (7일)
    minimumCacheTTL: 60 * 60 * 24 * 7,

    // SVG 지원 (보안 정책 적용)
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",

    // 외부 이미지 도메인 (필요시 추가)
    domains: [],

    // 이미지 로더 설정
    loader: 'default',

    // 최적화 활성화
    unoptimized: false,

    // 모바일 최적화를 위한 추가 설정
    remotePatterns: [
      // 필요시 외부 이미지 패턴 추가
    ]
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
    webpack: (config, { isServer, dev }) => {
      // 트리 쉐이킹 최적화
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
        // 모바일 최적화를 위한 코드 스플리팅
        splitChunks: {
          ...config.optimization.splitChunks,
          chunks: 'all',
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            // AI-PM 모듈 별도 청크
            aipm: {
              test: /[\\/]src[\\/]components[\\/]ai-pm[\\/]/,
              name: 'ai-pm',
              chunks: 'all',
              priority: 10,
            },
            // UI 컴포넌트 별도 청크
            ui: {
              test: /[\\/]src[\\/]components[\\/]ui[\\/]/,
              name: 'ui-components',
              chunks: 'all',
              priority: 9,
            },
            // Ant Design 별도 청크
            antd: {
              test: /[\\/]node_modules[\\/]antd[\\/]/,
              name: 'antd',
              chunks: 'all',
              priority: 8,
            },
            // 모바일 특화 컴포넌트
            mobile: {
              test: /[\\/]src[\\/]components[\\/].*[Mm]obile.*\.tsx?$/,
              name: 'mobile-components',
              chunks: 'all',
              priority: 7,
            },
          },
        },
      };

      // 모바일에서 사용하지 않는 패키지 제외
      if (!isServer && !dev) {
        config.resolve.alias = {
          ...config.resolve.alias,
          // 개발 도구는 프로덕션에서 제외
          '@/components/dev/PerformanceMonitor': false,
        };
      }

      return config;
    },
  }),

  // PoweredByHeader 비활성화 (보안)
  poweredByHeader: false,

  // TypeScript 에러 무시 (개발 중)
  typescript: {
    ignoreBuildErrors: true,
  },



  // 개발 환경 설정
  ...(process.env.NODE_ENV === 'development' && {
    reactStrictMode: false,
  }),
};

export default nextConfig;
