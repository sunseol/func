// 관리자 계정 메타데이터 업데이트 스크립트
// 사용법: node scripts/update-admin.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('NEXT_PUBLIC_SUPABASE_URL이 설정되지 않았습니다.');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.');
  console.error('Supabase 대시보드 > Settings > API > service_role key를 복사하여 .env.local에 추가하세요.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateAdminUser() {
  try {
    // admin@funcommute.com 사용자 찾기
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('사용자 목록 조회 실패:', listError);
      return;
    }

    const adminUser = users.users.find(user => user.email === 'admin@funcommute.com');
    
    if (!adminUser) {
      console.error('admin@funcommute.com 사용자를 찾을 수 없습니다.');
      console.log('먼저 회원가입을 통해 admin@funcommute.com 계정을 생성하세요.');
      return;
    }

    console.log('현재 관리자 사용자 정보:');
    console.log('ID:', adminUser.id);
    console.log('Email:', adminUser.email);
    console.log('Current metadata:', adminUser.user_metadata);

    // 사용자 메타데이터 업데이트
    const { data, error } = await supabase.auth.admin.updateUserById(adminUser.id, {
      user_metadata: {
        full_name: '관리자',
        role: 'admin'
      }
    });

    if (error) {
      console.error('관리자 메타데이터 업데이트 실패:', error);
      return;
    }

    console.log('\n관리자 계정이 성공적으로 업데이트되었습니다!');
    console.log('이메일: admin@funcommute.com');
    console.log('이름: 관리자');
    console.log('역할: admin');
    console.log('업데이트된 메타데이터:', data.user.user_metadata);
  } catch (err) {
    console.error('오류 발생:', err);
  }
}

updateAdminUser();