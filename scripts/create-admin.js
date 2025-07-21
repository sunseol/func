// 관리자 계정 생성 스크립트
// 사용법: node scripts/create-admin.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // 서비스 역할 키 필요

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('환경변수가 설정되지 않았습니다.');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdminUser() {
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'admin@funcommute.com',
      password: 'admin123456',
      user_metadata: {
        full_name: '관리자',
        role: 'admin'
      },
      email_confirm: true // 이메일 확인 건너뛰기
    });

    if (error) {
      console.error('관리자 계정 생성 실패:', error);
      return;
    }

    console.log('관리자 계정이 성공적으로 생성되었습니다!');
    console.log('이메일: admin@funcommute.com');
    console.log('비밀번호: admin123456');
    console.log('사용자 ID:', data.user.id);
  } catch (err) {
    console.error('오류 발생:', err);
  }
}

createAdminUser();