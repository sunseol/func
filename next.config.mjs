/** @type {import('next').NextConfig} */
const nextConfig = {
  // 환경 변수 설정
  env: {
    NEXT_PUBLIC_GROQ_API_KEY: process.env.NEXT_PUBLIC_GROQ_API_KEY,
  },
};

export default nextConfig; 