# OKR Dashboard Requirements Matrix v1.0

작성일: 2026-02-14  
기준 문서: `/Users/jabez/Documents/100. Projects/codex-okr-dashboard/policy-doc.md` (v1.1.0)

## 1. 목적
스펙의 핵심 요구사항을 개발 가능한 항목으로 분해하고, 수용 기준(AC)과 검증 방법을 명시한다.

## 2. 범위/우선순위
- 범위: Sprint 1 프로토타입 기준 핵심 플로우
- 우선순위 규칙: `P0(비협상) > P1(핵심) > P2(운영/완성도)`

## 3. 요구사항 매트릭스
| ID | 우선순위 | 요구사항 | 수용 기준 (AC) | 검증 방법 | 근거 |
|---|---|---|---|---|---|
| RQ-001 | P0 | 반기(H1/H2) 미지정 저장 금지 | Objective/KR 생성 시 반기 필수 | API 유효성 테스트 | Spec 6 |
| RQ-002 | P0 | KR metric_type/unit 필수 | KR 생성 시 누락 시 400 오류 | API 유효성 테스트 | Spec 6 |
| RQ-003 | P0 | KR-Experiment N:M 연결 | KR 1개에 다수 실험 연결 가능, 실험 1개가 다수 KR 연결 가능 | 링크 생성/조회 테스트 | Spec 4,6 |
| RQ-004 | P0 | 실험 기여도(weight) 수동 입력 | 링크 생성 시 weight(0~100) 저장 가능 | API 테스트 | Spec 5 |
| RQ-005 | P0 | KR 기여 실험 자동 집계 | KR 상세 조회 시 연결 실험 기여도 자동 계산 | 계산 단위 테스트 | Spec 4 |
| RQ-006 | P0 | 월 실적 upsert | 동일 target_type/target_id/year_month 재입력 시 update | API 테스트 | Spec 6 |
| RQ-007 | P1 | KR 달성도 시각화 | KR 상세 화면에 목표/실적/달성률/기여 실험 표시 | UI 확인 | Spec 4,7 |
| RQ-008 | P1 | AARRR 단일 선택 | 실험 등록 시 AARRR은 1개만 허용 | API/UI 검증 | Spec 5 |
| RQ-009 | P1 | source_type 추적 | 실적값에 manual/synced/calculated 표시 | API 응답 확인 | Spec 9 |
| RQ-010 | P1 | 감사 로그 필수 필드 | 변경 시 actor/reason/timestamp 저장 | 로그 조회 확인 | Spec 8 |
| RQ-011 | P1 | 목표 수정 이력 보존 | KR 목표/정의 수정 시 before/after 값 저장 | AuditLog 확인 | Spec 5,8 |
| RQ-012 | P2 | 조직 단위 필터 | Domain/Division/Team 필터 조회 | API/UI 확인 | Spec 3,7 |
| RQ-013 | P2 | 대시보드 P95 3초 목표 | 주요 조회 API 응답 3초 이내(샘플 데이터 기준) | 간이 성능 측정 | Spec 10 |
| RQ-014 | P2 | Soft-delete 정책 | 삭제 시 deleted_at 설정 및 참조 무결성 검증 | API 테스트 | Spec 6 |

## 4. Sprint 1 포함 범위
- 포함: RQ-001~011
- 제외(다음 스프린트): RQ-012~014 심화 구현

## 5. 리스크 및 완화
- 외부 연동 미구현 리스크: 우선 mock adapter로 대체
- 계산 기준 혼선 리스크: 달성률 공식과 weight 정규화 규칙을 명문화
- 권한 복잡도 리스크: Sprint 1은 role header 기반 경량 제어, 이후 RBAC 고도화

## 6. 산출물 연결
- 백로그: `/Users/zonetwo/Documents/CODEX-okr-dashboard/pm/SPRINT1_BACKLOG_v1.0.md`
- ERD: `/Users/zonetwo/Documents/CODEX-okr-dashboard/architecture/ERD_AND_DATA_RULES_v1.0.md`
- API: `/Users/zonetwo/Documents/CODEX-okr-dashboard/architecture/openapi.yaml`
- 운영: `/Users/zonetwo/Documents/CODEX-okr-dashboard/docs/OPERATIONS_RUNBOOK_v1.0.md`
