OKR Dashboard 정책 문서 v1.1.0
/목차

# 문서 메타
| 항목 | 내용 |
| --- | --- |
| 문서 버전 | v1.1.0 |
| 최종 수정일 | 2026-02-18 |
| 적용 범위 | `prototype/` 서버/웹 UI 실제 구현 |
| 통합 상태 | 기존 Master Spec 핵심 내용을 본 문서(v1.1.0)로 통합 완료함 |
| 대상 독자 | PM, 운영 어드민, 엔지니어, QA |
| 기준 코드 | `prototype/src/server.js`, `prototype/src/validation.js`, `prototype/src/supabaseStore.js`, `prototype/public/app.js` |

# 문제 정의
- 목표-실험-성과 데이터가 분산되면 운영 판단 속도 저하됨.
- 수기 운영 비중이 높으면 월 실적/실험 연결에서 오류 누적됨.
- 변경 이력이 남지 않으면 책임 추적과 운영 감사가 불가능해짐.
- 운영 화면과 DB 상태가 다르면 신뢰 가능한 서비스 운영이 불가능해짐.

# 근거 데이터
## 현재 구현 범위
| 영역 | 구현 상태 | 근거 코드 |
| --- | --- | --- |
| 목표 계층 | Objective → KR → Sub-KR → Initiative CRUD 제공됨 | `prototype/src/server.js`의 `/api/objectives`, `/api/krs`, `/api/sub-krs`, `/api/initiatives` |
| 실험 연결 | Experiment 생성/수정 + KR/Initiative 1개 타깃 매핑 제공됨 | `app.post('/api/experiments/:experimentId/mappings')` |
| 월 실적 | `targetType+targetId+yearMonth` 업서트 제공됨 | `validateMonthlyUpsert()`, `/api/monthly-performances/upsert` |
| 인풋 운영 | 등록/과제화(convert/reject)/삭제 제공됨 | `/api/input-sources`, `/api/input-sources/:id/process`, `/api/input-sources/:id` |
| 감사 로그 | 모든 쓰기 API에서 `actor/reason/before/after` 기록함 | `addAuditLog()` 호출 패턴 |
| Supabase 동기화 | 감사로그 기반 delta sync 우선 적용됨 | `syncStoreMutationToSupabase()` |

## 확정 정책(비협상)
| 정책 | 현재 반영 |
| --- | --- |
| AARRR 단일 선택 | 반영됨 (`validateExperiment`) |
| 실험 기여 가중치 수동 관리 | 반영됨 (`validateKRExperimentLink`, `weight`) |
| 반기 내 목표 수정 허용 + 이력 저장 | 반영됨 (각 update API + audit) |
| 월 실적 upsert | 반영됨 (`monthly_performances`) |
| soft-delete + 참조 검증 | 반영됨 (delete API의 409 제약) |

# 해결 방안
## 시스템 구조
| 컴포넌트 | 역할 | 근거 코드 |
| --- | --- | --- |
| API 서버 | 엔티티 CRUD, 검증, 감사로그 처리 | `prototype/src/server.js` |
| 검증 모듈 | 요청 필수값/enum/형식 검증 | `prototype/src/validation.js` |
| 저장소 동기화 | 로컬 캐시 + Supabase delta 동기화 | `persistStore()`, `syncStoreMutationToSupabase()` |
| 웹 UI | 화면별 CRUD 호출 및 운영 액션 제공 | `prototype/public/app.js` |

## 도메인 모델
| 엔티티 | 핵심 필드 | 규칙 |
| --- | --- | --- |
| Objective | `half`, `year`, `title`, `division/team`, `domain` | 생성/수정/삭제 모두 감사로그 남김 |
| KR | `objectiveId`, `targetValue`, `status`, `team/division` | 연결 Sub-KR/Initiative/실험 링크 있으면 삭제 차단 |
| Sub-KR | `krId`, `targetValue`, `status` | 연결 Initiative 있으면 삭제 차단 |
| Initiative | `subKrId or objectiveId`, `progressQuant`, `status` | 실험 링크 있으면 삭제 차단 |
| Experiment | `platformExperimentId`, `aarrrTag`, `status`, `result` | KR/Initiative 매핑 있으면 삭제 차단 |
| MonthlyPerformance | `targetType`, `targetId`, `yearMonth`, `actualValue` | 동일 키는 upsert |
| InputSource | `classification`, `product`, `source`, `status` | convert/reject 결정 로직 분기 |

## 데이터 흐름
1. 사용자 UI 입력 발생함 (`prototype/public/app.js`의 `fetchJSON`)  
2. 서버에서 유효성 검증 수행함 (`prototype/src/validation.js`)  
3. Store 변경 및 AuditLog 적재함 (`addAuditLog`)  
4. Supabase delta 동기화 수행함 (`syncStoreMutationToSupabase`)  
5. 대시보드/목록 API 재조회로 최신 상태 반영함 (`renderCurrentRoute`)  

## 화면-API 매핑
| 화면 | 주요 액션 | API |
| --- | --- | --- |
| Objective | 생성/삭제 | `POST /api/objectives`, `DELETE /api/objectives/:objectiveId` |
| KR | 상태수정/삭제 | `POST /api/krs/:krId`, `DELETE /api/krs/:krId` |
| KR 목록 | KR/Sub-KR 생성/삭제 | `POST /api/krs`, `POST /api/sub-krs`, `DELETE /api/krs/:krId`, `DELETE /api/sub-krs/:subKrId` |
| Initiative | 상태/진행률 수정, 삭제 | `POST /api/initiatives/:initiativeId`, `DELETE /api/initiatives/:initiativeId` |
| Experiment | 생성/수정/매핑/삭제 | `POST /api/experiments`, `POST /api/experiments/:experimentId`, `POST /api/experiments/:experimentId/mappings`, `DELETE /api/experiments/:experimentId` |
| Input | 등록/결정/삭제 | `POST /api/input-sources`, `POST /api/input-sources/:inputSourceId/process`, `DELETE /api/input-sources/:inputSourceId` |
| Preset | 추가/수정/삭제 | `POST /api/admin/presets*` |

# 운영 정책
## 권한 모델
| 역할 | 핵심 책임 |
| --- | --- |
| Admin | Preset, 감사로그, 정책 기준 관리 |
| Leadership | Review 기반 의사결정 |
| PM/도메인 리드 | Objective/KR/Initiative 운영 |
| Analyst/실험 담당 | Experiment 생성/매핑/결과 관리 |
| Input 운영 담당 | Input 등록 및 과제화 결정 |

## 감사/추적 정책
| 항목 | 규칙 |
| --- | --- |
| 필수 감사 필드 | `actor`, `reason`, `beforeValue`, `afterValue` |
| 삭제 정책 | soft-delete + 참조 무결성 위반 시 `409` 반환 |
| 동기화 정책 | full reload 지양, mutation delta sync 우선 |

## 성능/가용성 목표
| 항목 | 목표 |
| --- | --- |
| 대시보드 응답 | P95 3초 이내 |
| 서비스 가용성 | 99.9% |
| 데이터 일관성 | UI CRUD와 DB row 상태 동기 일치 |

# 기대 효과
- 운영자가 화면 액션 기준으로 데이터 상태를 신뢰 가능해짐.
- 월 실적/실험 기여/인풋 과제화가 동일 정책으로 감사 가능해짐.
- 삭제 제약(409)과 사용자 안내 문구로 데이터 무결성 파손 방지됨.
- 문서 SoT를 단일화해 정책 해석 비용 줄어듦.

# 변경 이력
| 날짜 | 버전 | 변경 내용 |
| --- | --- | --- |
| 2026-02-14 | v1.0.0 | 초기 정책 문서 작성 |
| 2026-02-18 | v1.1.0 | 현재 코드 기준으로 전면 정합화, 마스터 스펙 통합, CRUD/동기화 정책 업데이트 |
