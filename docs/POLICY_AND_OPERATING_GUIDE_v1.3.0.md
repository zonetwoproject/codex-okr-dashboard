# OKR Dashboard 정책/운영 통합 문서 v1.3.0
/목차

# 문서 메타
| 항목 | 내용 |
| --- | --- |
| 문서 버전 | v1.3.0 |
| 최종 수정일 | 2026-02-23 |
| 문서 성격 | 정책 문서 + 운영 가이드 통합본 |
| 적용 범위 | `prototype/` 서버/웹 UI 실제 구현 |
| 대상 독자 | PM/도메인 리드, OKR 어드민, 엔지니어, QA, 실험 분석 지원 담당 |
| 기준 코드 | `prototype/src/server.js`, `prototype/src/validation.js`, `prototype/src/supabaseStore.js`, `prototype/public/app.js` |
| SoT(단일 기준) | 본 문서 (`docs/POLICY_AND_OPERATING_GUIDE_v1.3.0.md`) |

# 1. 문제 정의
- 목표-실험-성과 데이터가 분산되면 운영 판단 속도가 저하됨.
- 수기 운영 비중이 높으면 월 실적/실험 연결에서 오류가 누적됨.
- 변경 이력이 남지 않으면 책임 추적과 운영 감사가 불가능함.
- 운영 화면과 DB 상태가 다르면 서비스 신뢰성이 저하됨.

# 2. 정책 기준
## 2.1 현재 구현 범위
| 영역 | 구현 상태 | 근거 코드 |
| --- | --- | --- |
| 목표 계층 | Objective → KR → Sub-KR → Initiative CRUD 제공 | `/api/objectives`, `/api/krs`, `/api/sub-krs`, `/api/initiatives` |
| 실험 연결 | Experiment 생성/수정 + 실험 1건당 KR/Initiative 단일 타깃 매핑 | `/api/experiments/:experimentId/mappings` |
| 월 실적 | `targetType+targetId+yearMonth` upsert + Total Table row 월업서트 | `/api/monthly-performances/upsert`, `/api/dashboard/okr-table/:rowId/monthly-upsert` |
| 인풋 운영 | 등록/과제화(convert/reject)/삭제 + KR/Sub-KR/Initiative 타깃 변환 | `/api/input-sources`, `/api/input-sources/:id/process`, `/api/input-sources/:id` |
| 알림 운영 | 월 실적 등록/미등록 알림 조회 + 화면 내 월 실적 업데이트 | `/api/dashboard/notifications` |
| 감사/의사결정 | 쓰기 API 감사로그 + DecisionLog 등록/조회 | `addAuditLog()`, `/api/decision-logs` |
| Preset/Taxonomy | preset CRUD, team-division 매핑, 필수 preset 누락 시 503 차단 | `/api/admin/presets*`, `ensureRequiredPresets()` |
| 동기화 | Supabase 필수 런타임 + audit 기반 delta sync | `bootstrapStore()`, `persistStore()`, `syncStoreMutationToSupabase()` |

## 2.2 확정 정책(비협상)
| 정책 | 반영 상태 |
| --- | --- |
| AARRR 단일 선택 | 반영 (`validateExperiment`) |
| 실험 기여 가중치 입력 비노출 | 반영 (UI 입력 없음, 매핑 시 기본값 적용) |
| 실험 단일 타깃 매핑 | 반영 (실험당 KR/Initiative 중 1개만 허용) |
| 반기 내 목표 수정 허용 + 이력 저장 | 반영 (각 update API + audit) |
| 월 실적 upsert | 반영 (`monthly_performances`) |
| soft-delete + 참조 검증 | 반영 (delete API 409 제약) |
| Preset 필수값 강제 | 반영 (`domains/divisions/input*` 누락 시 503) |

## 2.3 권한 모델
| 역할 | 핵심 책임 |
| --- | --- |
| Admin | Preset, 감사로그/의사결정 로그, 정책 기준 관리 |
| Leadership | Review 기반 의사결정 |
| PM/도메인 리드 | Objective/KR/Initiative/Experiment 생성·매핑·결과 운영 |
| Analyst/실험 분석 지원 | 실험 성과 분석 및 지표 검증 지원 |
| Input 운영 담당 | Input 등록 및 과제화 결정 |

## 2.4 감사/추적 정책
| 항목 | 규칙 |
| --- | --- |
| 필수 감사 필드 | 원칙: `actor`, `reason`, `beforeValue`, `afterValue` |
| 예외 동작 | `PATCH /api/dashboard/okr-table/:rowId`, `POST /api/dashboard/okr-table/:rowId/monthly-upsert`는 `actor/reason` 미입력 시 기본값 저장 |
| 삭제 정책 | soft-delete + 참조 무결성 위반 시 `409` 반환 |
| 매핑 정책 | 실험 매핑은 replace 방식, 실험 1건당 단일 타깃 유지 |
| 동기화 정책 | Supabase env 미설정 시 서비스 부팅 실패, mutation delta sync 우선 |

## 2.5 기준 enum
| 구분 | canonical 값 |
| --- | --- |
| OKR 상태 | `planned`, `in_progress`, `production_released`, `spec_out`, `dropped`, `holding` |
| Experiment 상태 | `before_start`, `in_progress`, `winner_selected`, `ended`, `discarded` |
| Experiment 결과 | `위너 선정 전`, `대조군(A) 위너 선정`, `실험군(B) 위너 선정` |
| Input 상태 | `registered`, `converted`, `rejected` |

# 3. 운영 가이드
## 3.1 운영 원칙
- 화면 등록/수정/삭제는 DB row 단위로 즉시 반영되어야 함.
- 쓰기 요청은 `actor`, `reason` 입력을 원칙으로 함.
- 삭제는 참조 무결성 우선이며 의존 데이터가 있으면 선행 정리가 필요함.
- Preset은 조직/분류 기준값의 SoT이며 필수값 누락 시 운영 API가 차단될 수 있음.
- 서비스는 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`가 없으면 부팅되지 않음.

## 3.2 메뉴별 운영 포인트
| 화면 | 운영 포인트 | 확인 항목 |
| --- | --- | --- |
| Executive | 전사 신호/리스크 KR 모니터링 | red/yellow 급증 여부, 상위 기여 실험 이상치 |
| Domain | 도메인/조직 필터 점검 | 필터값이 Preset 조직과 일치하는지 확인 |
| Review | 최근 변경 이력 리뷰 | `actor/reason` 누락 로그 없는지 확인 |
| Notifications | 월 실적 등록/미등록 관리 | 미등록 backlog, 월별 누락 대상 owner/조직 점검 |
| Total Table | 통합 상태 점검/보정 | 월 실적, 상태, 신호등, CSV export 정합성 확인 |

## 3.3 월간 운영 체크리스트
| 시점 | 체크 항목 | 담당 |
| --- | --- | --- |
| 월 마감 직후 | 월 실적 입력/정정 완료 여부 (Notifications 기준) | 각 도메인 PM |
| 월 마감+1일 | red/yellow KR 원인 확인 및 대응 소유자 지정 | 리더십 + 도메인 리드 |
| 주간 정기 리뷰 | 실험 매핑 최신화 + 단일 타깃 정책 준수 점검 | PM/도메인 리드 + KR 오너 |
| 수시 | 인풋 미결정 backlog 정리 | 인풋 운영 담당 |
| 수시 | Preset 조직/분류 최신성 점검 (필수 preset 누락 포함) | OKR 어드민 |
| 수시 | Total Table row 수정/월업서트 후 row audit 로그 확인 | OKR 어드민 |

## 3.4 장애/이상 대응
### 3.4.1 409 충돌 에러
| 상황 | 의미 | 조치 |
| --- | --- | --- |
| Objective 삭제 실패 | 하위 KR/Initiative 존재 | 하위 항목 선삭제 또는 상태 전환 |
| KR 삭제 실패 | Sub-KR/Initiative/Experiment 링크 존재 | 링크 해제 후 재시도 |
| Initiative 삭제 실패 | Experiment 링크 존재 | 매핑 해제 후 재시도 |
| Experiment 삭제 실패 | KR/Initiative 매핑 존재 | 매핑 해제 후 재시도 |

### 3.4.2 400 검증 에러
| 에러 상황 | 의미 | 조치 |
| --- | --- | --- |
| `only one mapping target is allowed per experiment` | 실험에 복수 타깃 매핑 시도 | KR/Initiative 중 1개만 선택 후 재요청 |
| `yearMonth cannot be in the future` | 미래 월 실적 입력 시도 | 현재 월 이하로 변경 후 재요청 |
| `goalType must be kr|sub_kr|initiative` | 인풋 과제화 타입 오류 | 허용 타입으로 수정 후 재요청 |

### 3.4.3 503 preset 에러
1. 응답의 `missingPresetTypes` 확인
2. `POST /api/admin/presets`로 누락 타입 복구
3. `GET /api/admin/taxonomy` 정상화 확인 후 운영 재개

### 3.4.4 부팅 실패/500 동기화 에러
1. 서버 로그에서 Supabase env 누락 여부 확인
2. env 복구 후 재기동
3. 재시도 후 동일하면 최근 audit 이벤트와 entity row 상태 대조

## 3.5 운영 KPI
| KPI | 목표 |
| --- | --- |
| 월 실적 입력 완료율 | 100% |
| 감사로그 유효율(actor/reason 포함) | 100% |
| 삭제 충돌(409) 해결 리드타임 | 영업일 1일 이내 |
| 대시보드 주요 API 오류율 | 1% 미만 |
| Notifications 미등록 backlog 처리 리드타임 | 영업일 2일 이내 |

# 4. API 맵(운영 관점)
| 화면/기능 | 핵심 API |
| --- | --- |
| Objective 운영 | `POST /api/objectives`, `POST /api/objectives/:objectiveId`, `DELETE /api/objectives/:objectiveId` |
| KR/Sub-KR 운영 | `POST /api/krs`, `POST /api/krs/:krId`, `POST /api/sub-krs`, `POST /api/sub-krs/:subKrId` |
| Initiative 운영 | `POST /api/initiatives`, `POST /api/initiatives/:initiativeId`, `DELETE /api/initiatives/:initiativeId` |
| Experiment 운영 | `POST /api/experiments`, `POST /api/experiments/:experimentId`, `POST /api/experiments/:experimentId/mappings` |
| Input 운영 | `POST /api/input-sources`, `POST /api/input-sources/:inputSourceId/process`, `GET /api/input-sources/summary` |
| Total Table 운영 | `GET /api/dashboard/okr-table`, `GET /api/dashboard/okr-table/export.csv`, `PATCH /api/dashboard/okr-table/:rowId`, `POST /api/dashboard/okr-table/:rowId/monthly-upsert`, `GET /api/dashboard/okr-table/:rowId/audit` |
| Notifications 운영 | `GET /api/dashboard/notifications` |
| 운영 관리 | `GET /api/admin/presets`, `POST /api/admin/presets*`, `GET /api/audit-logs`, `GET /api/decision-logs` |

# 5. 변경 이력
| 날짜 | 버전 | 변경 내용 |
| --- | --- | --- |
| 2026-02-14 | v1.0.0 | 초기 정책/운영 문서 작성 |
| 2026-02-18 | v1.1.0 | 코드 기준 정합화 반영 |
| 2026-02-22 | v1.2.0 | Notifications/Total Table/단일 매핑/Preset 503/Supabase 필수 반영 |
| 2026-02-23 | v1.3.0 | 정책/운영 문서 통합, docs 폴더 SoT 전환 |
| 2026-02-23 | v1.3.0 | 실험 가중치 수동 입력 정책 문구 제거(현재 UI 동작 기준 반영) |
