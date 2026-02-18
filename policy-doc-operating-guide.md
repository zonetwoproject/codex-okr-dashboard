OKR Dashboard 운영 가이드 v1.1.0
/목차

# 문서 메타
| 항목 | 내용 |
| --- | --- |
| 문서 버전 | v1.1.0 |
| 최종 수정일 | 2026-02-18 |
| 기준 문서 | `policy-doc.md` v1.1.0 |
| 대상 | 전사 OKR 어드민, 도메인 PM/리드, 실험 담당, 인풋 운영 담당 |

# 운영 원칙
- 화면에서 수행한 등록/수정/삭제는 DB row 단위로 즉시 반영되어야 함.
- 모든 쓰기 요청은 `actor`, `reason`을 필수 입력해야 함.
- 삭제는 참조 무결성 우선임. 의존 데이터가 있으면 삭제 대신 선행 정리 필요함.
- Preset은 조직/분류 기준값의 SoT임. 운영 시작 전 최신화 필요함.

# 메뉴별 운영 가이드
## 대시보드
| 화면 | 운영 포인트 | 확인 항목 |
| --- | --- | --- |
| Executive | 전사 신호/리스크 KR 모니터링 | red/yellow 급증 여부, 상위 기여 실험 이상치 |
| Domain | 도메인/조직 필터 점검 | 필터값이 Preset 조직과 일치하는지 확인 |
| Review | 최근 변경 이력 리뷰 | `actor/reason` 누락 로그 없는지 확인 |
| Total Table | 통합 상태 점검 | 월 실적, 상태, 신호등 계산 결과 정합성 확인 |

## 목표/이니셔티브
| 화면 | 등록/수정 | 삭제 제약(실패 시 409) |
| --- | --- | --- |
| Objective | `POST /api/objectives`, `POST /api/objectives/:id` | KR/Initiative 연결 시 삭제 불가 |
| KR | `POST /api/krs`, `POST /api/krs/:id` | Sub-KR/Initiative/Experiment 링크 있으면 삭제 불가 |
| Sub-KR | `POST /api/sub-krs`, `POST /api/sub-krs/:id` | Initiative 연결 시 삭제 불가 |
| Initiative | `POST /api/initiatives`, `POST /api/initiatives/:id` | Experiment 링크 있으면 삭제 불가 |
| Experiment | `POST /api/experiments`, `POST /api/experiments/:id`, `POST /api/experiments/:id/mappings` | KR/Initiative 매핑 있으면 삭제 불가 |

## 인풋
| 작업 | API | 운영 규칙 |
| --- | --- | --- |
| 인풋 등록 | `POST /api/input-sources` | 분류/프로덕트/소스는 Preset 값만 사용함 |
| 과제화 결정 | `POST /api/input-sources/:id/process` | convert 시 `goalType+goalId` 필수, reject 시 `rejectionReason` 필수 |
| 삭제 | `DELETE /api/input-sources/:id` | 등록/결정 후에도 삭제 가능. 감사로그 필수 |

## 관리
| 화면 | 운영 항목 | 주기 |
| --- | --- | --- |
| Preset | 도메인/실/팀, 인풋 분류/프로덕트/소스 | 조직 개편 시 즉시, 월 1회 정기 점검 |
| Audit Logs | 변경 이력 모니터링 | 주 1회 정기 점검 + 릴리즈 당일 점검 |

# 월간 운영 체크리스트
| 시점 | 체크 항목 | 담당 |
| --- | --- | --- |
| 월 마감 직후 | 월 실적 입력/정정 완료 여부 | 각 도메인 PM |
| 월 마감+1일 | red/yellow KR 원인 확인 및 대응 소유자 지정 | 리더십 + 도메인 리드 |
| 주간 정기 리뷰 | 실험 매핑/가중치 최신화 | 실험 담당 + KR 오너 |
| 수시 | 인풋 미결정 건 backlog 정리 | 인풋 운영 담당 |
| 수시 | Preset 조직/분류 최신성 점검 | OKR 어드민 |

# 장애/이상 대응 가이드
## 409 충돌 에러
| 에러 상황 | 의미 | 조치 |
| --- | --- | --- |
| Objective 삭제 실패 | 하위 KR/Initiative 존재 | 하위 항목 선삭제 또는 상태 전환 |
| KR 삭제 실패 | Sub-KR/Initiative/Experiment 링크 존재 | 링크 해제 후 재시도 |
| Initiative 삭제 실패 | Experiment 링크 존재 | 매핑 해제 후 재시도 |
| Experiment 삭제 실패 | KR/Initiative 매핑 존재 | 매핑 해제 후 재시도 |

## 500 동기화 에러
1. Vercel 로그에서 실패 API와 에러 메시지 확인함.
2. Supabase 환경변수(`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) 설정 확인함.
3. 재시도 후 동일하면 `audit_logs` 마지막 이벤트와 해당 entity row 상태 비교함.

# 운영 KPI
| KPI | 목표 |
| --- | --- |
| 월 실적 입력 완료율 | 100% |
| 감사로그 유효율(actor/reason 포함) | 100% |
| 삭제 충돌(409) 해결 리드타임 | 영업일 1일 이내 |
| 대시보드 주요 API 오류율 | 1% 미만 |

# 변경 이력
| 날짜 | 버전 | 변경 내용 |
| --- | --- | --- |
| 2026-02-14 | v1.0.0 | 초기 운영 가이드 작성 |
| 2026-02-18 | v1.1.0 | 현재 코드 기준 API/삭제 제약/장애 대응 절차 업데이트 |
