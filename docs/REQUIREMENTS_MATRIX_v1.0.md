# OKR Dashboard Requirements Matrix v1.3.0

> 현재 프로토타입 동작 기준 요구사항과 수용 기준(AC), 검증 방법, 릴리즈 게이트를 통합 관리하는 기준 문서

## 문서 메타
| 항목 | 내용 |
| --- | --- |
| 작성일 | 2026-02-22 |
| 문서 버전 | v1.3.0 |
| 기준 문서 | `/Users/ungs2/Documents/100. Projects/codex-okr-dashboard/docs/POLICY_AND_OPERATING_GUIDE_v1.3.0.md` |
| 범위 | `prototype/` 런타임 운영 핵심 플로우 |

---

## 1. 우선순위 정의
| 우선순위 | 의미 | 릴리즈 조건 |
| --- | --- | --- |
| P0 | 비협상(정책/안정성 필수) | 미충족 시 릴리즈 불가 |
| P1 | 핵심 운영 기능 | 예외 승인 없으면 릴리즈 포함 |
| P2 | 완성도/확장성 | 스프린트 내 우선순위에 따라 조정 |

## 2. 영역별 커버리지 요약
| 영역 | 핵심 요구사항 ID |
| --- | --- |
| Objective/KR/Sub-KR | RQ-001, RQ-002, RQ-006 |
| Experiment/Mapping | RQ-003, RQ-004, RQ-005 |
| Notifications/Total Table | RQ-007, RQ-008, RQ-016 |
| Input/Preset/삭제 정책 | RQ-009, RQ-010, RQ-011 |
| 감사/운영/런타임 | RQ-012, RQ-013, RQ-015 |
| 탐색성 | RQ-014 |

---

## 3. 요구사항 매트릭스
| ID | 우선순위 | 요구사항 | 수용 기준 (AC) | 검증 방법 | 근거 코드 |
| --- | --- | --- | --- | --- | --- |
| RQ-001 | P0 | Objective 필수 입력 강제 | 생성 시 `half/year/title/organization/domain/actor/reason` 누락이면 400 | API 유효성 테스트 | `validateObjective()` |
| RQ-002 | P0 | KR/Sub-KR 목표값 양수 검증 | 생성/수정 시 `targetValue <= 0` 이면 400 | API 유효성 테스트 | `validateKR()`, `validateSubKR()` |
| RQ-003 | P0 | Experiment enum 강제 | 상태/결과가 canonical enum 외 값이면 400 | API 유효성 테스트 | `parseExperimentStatus()`, `parseExperimentResult()` |
| RQ-004 | P0 | 실험 단일 타깃 매핑 | 실험 1건에 KR/Initiative 복수 매핑 요청 시 400 | API 테스트 | `/api/experiments/:experimentId/mappings` |
| RQ-005 | P0 | KR 기여도 weight 기본값 적용 | 실험 매핑 API에서 `weight` 미전송 시 기본값(100) 저장 | API 테스트 | `/api/experiments/:experimentId/mappings` |
| RQ-006 | P0 | 월 실적 upsert + 미래월 차단 | 동일 키는 update, 미래월 입력은 400 | API 테스트 | `validateMonthlyUpsert()` |
| RQ-007 | P1 | Total Table 월업서트 규칙 | `month 1..6`, `sourceType` enum 강제 | API 테스트 | `/api/dashboard/okr-table/:rowId/monthly-upsert` |
| RQ-008 | P1 | Notifications 운영 API | `registered/missing` 상태로 알림 조회 가능 | API/UI 확인 | `/api/dashboard/notifications` |
| RQ-009 | P1 | Input 과제화 타깃 확장 | convert 시 `kr/sub_kr/initiative`, reject 시 사유 필수 | API/UI 확인 | `validateInputSourceProcess()` |
| RQ-010 | P1 | Preset 필수값 게이트 | 필수 preset 누락 시 taxonomy/preset API 503 | API 테스트 | `ensureRequiredPresets()` |
| RQ-011 | P1 | Soft-delete + 참조 무결성 | 의존 존재 시 409, 아니면 soft-delete | API 테스트 | 각 `DELETE /api/*` |
| RQ-012 | P1 | 감사 로그 추적성 | 주요 쓰기 요청 `actor/reason/before/after/timestamp` 기록 | 로그 조회 확인 | `addAuditLog()` 호출 경로 |
| RQ-013 | P2 | 의사결정 로그 운영 | Decision Log 생성/조회 가능, 생성 시 audit 연계 저장 | API 테스트 | `/api/decision-logs` |
| RQ-014 | P2 | 통합 검색 지원 | 검색어로 objectives/krs/experiments/initiatives 동시 조회 | API 테스트 | `/api/search` |
| RQ-015 | P0 | Supabase 필수 런타임 | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 미설정 시 부팅 실패 | 부팅 테스트 | `bootstrapStore()` |
| RQ-016 | P2 | Total Table CSV 내보내기 | 계층 정렬 + 실험 컬럼 동적 확장 CSV 다운로드 | API/UI 확인 | `/api/dashboard/okr-table/export.csv` |

## 4. 검증 전략 매트릭스
| 검증 유형 | 목적 | 대상 요구사항 |
| --- | --- | --- |
| API Validation Test | 입력/에러 규칙 검증 | RQ-001~007, RQ-009~011 |
| API Integration Test | 엔드투엔드 동작 검증 | RQ-004, RQ-006, RQ-008, RQ-013, RQ-016 |
| Runtime/Boot Test | 환경 의존성 검증 | RQ-015 |
| UI Smoke Test | 운영 화면 핵심 플로우 확인 | RQ-008, RQ-016 |
| Audit Log Check | 추적성/운영 품질 검증 | RQ-012, RQ-013 |

## 5. 릴리즈 게이트
| 게이트 | 기준 | 결과 |
| --- | --- | --- |
| P0 요구사항 | 전 항목 충족 | [ ] |
| 핵심 운영 API | 오류율 기준 충족 | [ ] |
| 감사로그 유효성 | 누락/오기록 없음 | [ ] |
| 운영 체크리스트 | Runbook 기준 완료 | [ ] |

---

## 6. 포함 범위 및 개선 후보
| 구분 | 항목 |
| --- | --- |
| 포함 범위 | RQ-001~012, RQ-015 |
| 운영 확장 | RQ-008, RQ-013, RQ-016 |
| 개선 후보 | RQ-014 검색 relevance 고도화, 성능 목표 계측 자동화 |

## 7. 리스크 및 완화
| 리스크 | 완화 전략 |
| --- | --- |
| Supabase 설정 누락 | 배포 파이프라인에서 env 사전 검증 |
| Preset 누락 | 운영 시작 체크리스트에 `taxonomy 200` 고정 |
| 매핑 정책 오해 | 실험 화면에 단일 타깃 정책 문구 유지 |
| 감사 필드 품질 저하 | patch/monthly-upsert 호출 시 actor/reason 명시 입력 |

## 8. 산출물 연결
| 유형 | 경로 |
| --- | --- |
| 통합 정책/운영 문서 | `/Users/ungs2/Documents/100. Projects/codex-okr-dashboard/docs/POLICY_AND_OPERATING_GUIDE_v1.3.0.md` |
| 운영 런북 | `/Users/ungs2/Documents/100. Projects/codex-okr-dashboard/docs/OPERATIONS_RUNBOOK_v1.0.md` |
| 서버 구현 | `/Users/ungs2/Documents/100. Projects/codex-okr-dashboard/prototype/src/server.js` |
| 검증 모듈 | `/Users/ungs2/Documents/100. Projects/codex-okr-dashboard/prototype/src/validation.js` |

## 9. 변경 이력
| 날짜 | 버전 | 변경 내용 |
| --- | --- | --- |
| 2026-02-14 | v1.0.0 | 초기 Requirements Matrix 작성 |
| 2026-02-22 | v1.2.0 | Notifications/Total Table/단일 매핑/Preset 503/Supabase 필수 런타임 기준으로 정합화 |
| 2026-02-23 | v1.3.0 | 기준 문서를 통합본으로 전환 |
| 2026-02-23 | v1.3.0 | 실험 가중치 수동 입력 요구사항 제거(기본값 적용 기준 반영) |
| 2026-02-23 | v1.3.0 | 표/게이트/검증전략 중심 형식으로 가독성 개선 |
