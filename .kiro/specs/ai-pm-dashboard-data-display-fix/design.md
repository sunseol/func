# Design Document

## Overview

AI-PM 프로젝트 대시보드의 데이터 표시 문제를 해결하기 위한 설계입니다. API는 정상적으로 작동하지만 React 컴포넌트에서 상태 업데이트가 제대로 이루어지지 않는 문제를 진단하고 수정합니다.

## Architecture

### Problem Analysis

현재 상황:
- API `/api/ai-pm/projects/[projectId]`는 정상적으로 데이터 반환
- 응답 데이터에 `members` 배열과 `progress` 배열 포함
- 하지만 UI에서 멤버 수와 완료된 단계 수가 표시되지 않음

가능한 원인:
1. React 상태 업데이트 타이밍 문제
2. useEffect 의존성 배열 문제
3. 조건부 렌더링 로직 문제
4. 데이터 변환 로직 오류

### Solution Strategy

1. **디버깅 로그 추가**: 상태 변화 추적
2. **상태 업데이트 검증**: 데이터 수신 후 상태 확인
3. **렌더링 조건 검토**: 조건부 렌더링 로직 점검
4. **데이터 변환 검증**: 계산 로직 확인

## Components and Interfaces

### ProjectDetailPage Component

**현재 구조:**
```typescript
const [project, setProject] = useState<ProjectWithCreator | null>(null);
const [members, setMembers] = useState<ProjectMemberWithProfile[]>([]);
const [progress, setProgress] = useState<ProjectProgress[]>([]);
const [loading, setLoading] = useState(true);
```

**수정 사항:**
- 각 상태 업데이트에 디버깅 로그 추가
- 데이터 변환 로직 검증
- 렌더링 조건 명확화

### Data Flow

1. **API 호출**: `fetchProjectData()` 함수
2. **데이터 수신**: JSON 응답 파싱
3. **상태 업데이트**: `setProject`, `setMembers`, `setProgress`
4. **UI 렌더링**: 상태 기반 조건부 렌더링

## Data Models

### API Response Structure
```typescript
interface ProjectResponse {
  project: ProjectWithCreator;
  members: ProjectMemberWithProfile[];
  progress: ProjectProgress[];
}
```

### UI Display Logic
```typescript
// 멤버 수 계산
const memberCount = members.length;

// 완료된 단계 수 계산
const completedSteps = progress.filter(p => p.has_official_document).length;

// 진행률 계산
const progressPercentage = Math.round((completedSteps / 9) * 100);
```

## Error Handling

### Debugging Strategy

1. **Console Logging**: 각 단계별 상태 로그
2. **Error Boundaries**: React 에러 캐치
3. **Network Monitoring**: API 호출 상태 추적

### Error Recovery

1. **Retry Logic**: API 호출 실패 시 재시도
2. **Fallback UI**: 데이터 없을 때 기본값 표시
3. **User Feedback**: 명확한 에러 메시지

## Testing Strategy

### Manual Testing

1. **브라우저 개발자 도구**: 콘솔 로그 확인
2. **네트워크 탭**: API 호출 및 응답 검증
3. **React DevTools**: 컴포넌트 상태 모니터링

### Debugging Steps

1. API 응답 데이터 구조 확인
2. 상태 업데이트 로그 추가
3. 렌더링 조건 검증
4. 데이터 변환 로직 테스트

## Implementation Plan

### Phase 1: Debugging Enhancement
- 상태 업데이트 로그 추가
- API 응답 데이터 로그 추가
- 렌더링 조건 로그 추가

### Phase 2: Issue Identification
- 콘솔 로그 분석
- 상태 변화 패턴 파악
- 문제 지점 특정

### Phase 3: Fix Implementation
- 식별된 문제 수정
- 상태 업데이트 로직 개선
- 렌더링 조건 최적화

### Phase 4: Verification
- 수정 사항 테스트
- 데이터 표시 확인
- 디버깅 로그 정리