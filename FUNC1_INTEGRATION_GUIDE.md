# 🚀 func-1 프로젝트 AI PM 통합 가이드

## ✅ 완료된 작업

1. **파일 복사 완료**: AI PM 기능이 func-1 프로젝트로 성공적으로 복사되었습니다.
2. **의존성 업데이트**: package.json에 `@heroicons/react` 추가 완료
3. **디렉토리 구조**: 모든 필요한 폴더와 파일이 올바른 위치에 배치됨

## 📋 남은 작업 (수동으로 완료해야 함)

### 1. 의존성 설치
```bash
cd ../func-1
npm install
```

### 2. 메인 네비게이션에 AI PM 링크 추가

`../func-1/src/app/page.tsx` 파일의 Header 부분에서 다음 코드를 찾아:

```tsx
<Link href="/my-reports">
  <Button type="link" size="small" style={{ padding: '0 8px', color: 'white' }}>
    내 보고서
  </Button>
</Link>
<Link href="/notifications">
```

이 사이에 AI PM 링크를 추가:

```tsx
<Link href="/my-reports">
  <Button type="link" size="small" style={{ padding: '0 8px', color: 'white' }}>
    내 보고서
  </Button>
</Link>
<Link href="/ai-pm">
  <Button type="link" size="small" style={{ padding: '0 8px', color: 'white' }}>
    AI PM
  </Button>
</Link>
<Link href="/notifications">
```

### 3. AuthContext 통합 확인

기존 AuthContext와 충돌이 있을 수 있습니다. 다음을 확인하세요:

- `../func-1/src/contexts/AuthContext.tsx` (새로 추가된 AI PM용)
- `../func-1/src/context/AuthContext.tsx` (기존 func-1용)

**권장 방법**: AI PM 컴포넌트들이 기존 AuthContext를 사용하도록 import 경로를 수정:

```tsx
// AI PM 컴포넌트들에서
import { useAuth } from '@/context/AuthContext'; // 기존 경로 사용
```

### 4. 환경 변수 설정

`../func-1/.env.local` 파일에 다음 추가:

```env
# AI PM 관련 환경 변수
OPENAI_API_KEY=your_openai_api_key_here
```

### 5. 데이터베이스 마이그레이션 실행

Supabase 콘솔에서 다음 SQL 파일들을 실행:

1. `../func-1/database/migrations/001_ai_pm_schema.sql`
2. `../func-1/database/migrations/002_approval_workflow.sql`

### 6. 타입 체크 및 빌드 테스트

```bash
cd ../func-1
npm run type-check
npm run build
```

### 7. 개발 서버 실행

```bash
cd ../func-1
npm run dev
```

## 🔧 잠재적 문제 해결

### AuthContext 충돌 해결

만약 AuthContext 관련 오류가 발생하면:

1. AI PM 컴포넌트들의 import 경로를 기존 경로로 변경:
   ```tsx
   // 변경 전
   import { useAuth } from '@/contexts/AuthContext';
   
   // 변경 후
   import { useAuth } from '@/context/AuthContext';
   ```

2. 또는 AI PM용 AuthContext를 제거하고 기존 것을 사용

### 스타일링 충돌 해결

- Ant Design과 Tailwind CSS가 함께 사용되므로 스타일 충돌 가능
- 필요시 AI PM 컴포넌트에 CSS 모듈 적용

### API 라우트 확인

AI PM API 라우트들이 올바르게 작동하는지 확인:
- `/api/ai-pm/projects`
- `/api/ai-pm/documents`
- `/api/ai-pm/chat`

## 🎯 테스트 방법

1. 개발 서버 실행 후 `http://localhost:3000/ai-pm` 접속
2. 프로젝트 생성 테스트
3. 워크플로우 네비게이션 테스트
4. 문서 생성 및 편집 테스트

## 📞 문제 발생 시

1. 콘솔 에러 메시지 확인
2. 네트워크 탭에서 API 호출 상태 확인
3. 데이터베이스 연결 상태 확인
4. 환경 변수 설정 확인

## 🎉 완료 후 확인사항

- [ ] AI PM 메뉴가 네비게이션에 표시됨
- [ ] AI PM 페이지 접속 가능
- [ ] 프로젝트 생성 기능 작동
- [ ] 워크플로우 사이드바 표시
- [ ] 단계별 네비게이션 작동
- [ ] 워크플로우 가이드 표시

모든 단계가 완료되면 AI PM 기능이 func-1 프로젝트에 완전히 통합됩니다! 🚀