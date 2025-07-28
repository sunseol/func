-- AI PM 기능 테스트를 위한 시드 데이터
-- 주의: 개발 환경에서만 사용하세요!

-- 1. 기존 관리자 계정 확인 및 업데이트 (필요시)
INSERT INTO user_profiles (id, email, full_name, role, created_at, updated_at)
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)) as full_name,
    'admin' as role,
    created_at,
    NOW() as updated_at
FROM auth.users 
WHERE email = 'jakeseol99@keduall.com'
ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    updated_at = NOW();

-- 2. 테스트 프로젝트 생성
INSERT INTO projects (id, name, description, created_by, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    '테스트 AI PM 프로젝트',
    'AI PM 기능을 테스트하기 위한 샘플 프로젝트입니다.',
    (SELECT id FROM auth.users WHERE email = 'jakeseol99@keduall.com' LIMIT 1),
    NOW(),
    NOW()
);

-- 3. 프로젝트 멤버로 관리자 추가
INSERT INTO project_members (project_id, user_id, role, added_by, added_at)
SELECT 
    p.id,
    u.id,
    '서비스기획',
    u.id,
    NOW()
FROM projects p, auth.users u
WHERE p.name = '테스트 AI PM 프로젝트'
AND u.email = 'jakeseol99@keduall.com';

-- 4. 샘플 기획 문서 생성 (1단계)
INSERT INTO planning_documents (
    project_id, 
    workflow_step, 
    title, 
    content, 
    status, 
    version, 
    created_by, 
    created_at, 
    updated_at
)
SELECT 
    p.id,
    1,
    '서비스 개요 및 목표 설정',
    '# 서비스 개요 및 목표 설정

## 서비스 개요
이 프로젝트는 AI PM 기능을 테스트하기 위한 샘플 프로젝트입니다.

## 주요 목표
1. AI와의 대화를 통한 기획 문서 작성
2. 체계적인 9단계 워크플로우 진행
3. 팀 협업 및 문서 승인 프로세스

## 성공 지표
- 모든 워크플로우 단계 완료
- 팀 멤버 간 원활한 협업
- 고품질 기획 문서 산출',
    'official',
    1,
    u.id,
    NOW(),
    NOW()
FROM projects p, auth.users u
WHERE p.name = '테스트 AI PM 프로젝트'
AND u.email = 'jakeseol99@keduall.com';

-- 5. 샘플 AI 대화 생성
INSERT INTO ai_conversations (
    project_id,
    workflow_step,
    user_id,
    messages,
    created_at,
    updated_at
)
SELECT 
    p.id,
    1,
    u.id,
    jsonb_build_array(
        jsonb_build_object(
            'id', 'msg_1',
            'role', 'user',
            'content', '안녕하세요! 새로운 프로젝트의 서비스 개요를 작성하는데 도움이 필요합니다.',
            'timestamp', NOW()
        ),
        jsonb_build_object(
            'id', 'msg_2',
            'role', 'assistant', 
            'content', '안녕하세요! 서비스 개요 작성을 도와드리겠습니다. 먼저 어떤 종류의 서비스를 기획하고 계신지 알려주시겠어요?',
            'timestamp', NOW()
        )
    ),
    NOW(),
    NOW()
FROM projects p, auth.users u
WHERE p.name = '테스트 AI PM 프로젝트'
AND u.email = 'jakeseol99@keduall.com';

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '=== AI PM 시드 데이터 생성 완료 ===';
    RAISE NOTICE '1. 사용자를 관리자로 설정했습니다.';
    RAISE NOTICE '2. 테스트 프로젝트를 생성했습니다.';
    RAISE NOTICE '3. 프로젝트 멤버로 추가했습니다.';
    RAISE NOTICE '4. 샘플 기획 문서를 생성했습니다.';
    RAISE NOTICE '5. 샘플 AI 대화를 생성했습니다.';
    RAISE NOTICE '';
    RAISE NOTICE '관리자 계정 (jakeseol99@keduall.com)으로 테스트 데이터가 생성되었습니다.';
END $$;