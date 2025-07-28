-- AI PM 스키마 테스트 스크립트
-- 이 스크립트는 생성된 스키마가 올바르게 작동하는지 테스트합니다.

-- 테스트 시작
DO $$
BEGIN
    RAISE NOTICE '=== AI PM 스키마 테스트 시작 ===';
END $$;

-- 1. 테이블 존재 확인
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('projects', 'project_members', 'planning_documents', 'document_versions', 'ai_conversations');
    
    IF table_count = 5 THEN
        RAISE NOTICE '✓ 모든 테이블이 성공적으로 생성되었습니다.';
    ELSE
        RAISE NOTICE '✗ 테이블 생성 실패: %/5 테이블만 생성됨', table_count;
    END IF;
END $$;

-- 2. 인덱스 존재 확인
DO $$
DECLARE
    index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname LIKE 'idx_%';
    
    IF index_count >= 15 THEN
        RAISE NOTICE '✓ 인덱스가 성공적으로 생성되었습니다. (% 개)', index_count;
    ELSE
        RAISE NOTICE '✗ 인덱스 생성 부족: % 개만 생성됨', index_count;
    END IF;
END $$;

-- 3. RLS 정책 확인
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename IN ('projects', 'project_members', 'planning_documents', 'document_versions', 'ai_conversations');
    
    IF policy_count >= 10 THEN
        RAISE NOTICE '✓ RLS 정책이 성공적으로 생성되었습니다. (% 개)', policy_count;
    ELSE
        RAISE NOTICE '✗ RLS 정책 생성 부족: % 개만 생성됨', policy_count;
    END IF;
END $$;

-- 4. 트리거 확인
DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers 
    WHERE event_object_schema = 'public' 
    AND event_object_table IN ('projects', 'planning_documents', 'ai_conversations');
    
    IF trigger_count >= 5 THEN
        RAISE NOTICE '✓ 트리거가 성공적으로 생성되었습니다. (% 개)', trigger_count;
    ELSE
        RAISE NOTICE '✗ 트리거 생성 부족: % 개만 생성됨', trigger_count;
    END IF;
END $$;

-- 5. 뷰 확인
DO $$
DECLARE
    view_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO view_count
    FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name LIKE '%_with_%';
    
    IF view_count >= 3 THEN
        RAISE NOTICE '✓ 뷰가 성공적으로 생성되었습니다. (% 개)', view_count;
    ELSE
        RAISE NOTICE '✗ 뷰 생성 부족: % 개만 생성됨', view_count;
    END IF;
END $$;

-- 6. 함수 확인
DO $$
DECLARE
    function_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name IN ('get_project_progress', 'get_user_projects');
    
    IF function_count >= 2 THEN
        RAISE NOTICE '✓ 함수가 성공적으로 생성되었습니다. (% 개)', function_count;
    ELSE
        RAISE NOTICE '✗ 함수 생성 부족: % 개만 생성됨', function_count;
    END IF;
END $$;

-- 테스트 완료
DO $$
BEGIN
    RAISE NOTICE '=== AI PM 스키마 테스트 완료 ===';
END $$;