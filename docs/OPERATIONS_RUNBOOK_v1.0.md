# OKR Dashboard Operations Runbook v1.3.0

> 월간/반기 운영 루틴을 표준화해 데이터 정합성, 감사 가능성, 복구 가능성을 보장하는 운영 기준서

## 문서 메타
| 항목 | 내용 |
| --- | --- |
| 작성일 | 2026-02-22 |
| 문서 버전 | v1.3.0 |
| 기준 문서 | `/Users/ungs2/Documents/100. Projects/codex-okr-dashboard/docs/POLICY_AND_OPERATING_GUIDE_v1.3.0.md` |
| 적용 범위 | `prototype/` 운영 환경 기준 |
| 대상 | PM/도메인 리드, OKR 어드민, Analyst, Leadership, Input 운영 담당 |

---

## 1. 운영 목표
| 목표 | 설명 | 운영 지표 |
| --- | --- | --- |
| 데이터 정합성 | 월 실적/매핑/상태 데이터 일관성 유지 | 정합성 이슈 0건 지향 |
| 운영 안정성 | 장애 발생 시 신속 대응/복구 | 핵심 API 복구 목표 30분 |
| 감사 가능성 | 주요 변경의 책임 추적 가능 | 감사로그 유효율 100% |

## 2. 운영 전제 조건
| 구분 | 항목 | 확인 방법 |
| --- | --- | --- |
| 필수 환경변수 | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | 서버 부팅 로그/환경 점검 |
| 필수 preset | `domains`, `divisions`, `inputClassifications`, `inputProducts`, `inputSources` | `GET /api/admin/taxonomy` |
| 시작 점검 API | health/taxonomy/notifications | `GET /api/health`, `GET /api/admin/taxonomy`, `GET /api/dashboard/notifications?limit=50` |

## 3. 역할 및 책임
| 역할 | 핵심 책임 | 주요 산출물 |
| --- | --- | --- |
| Admin | 정책/권한/마스터 데이터, preset 유지 | preset 변경 이력, 운영 기준 유지 |
| PM/도메인 리드 | Objective/KR/Sub-KR/Initiative/Experiment 운영 | 월 실적 정합성, 매핑 최신화 |
| Analyst | 실험 성과 해석, 데이터 품질 검증 지원 | 분석 코멘트, 이상치 점검 |
| Leadership | 리뷰 승인, 리스크 우선순위 결정 | 의사결정 방향성 |
| Input 운영 담당 | 인풋 등록/과제화/미결정 backlog 처리 | 처리 완료 이력 |

---

## 4. 운영 Cadence
| 주기 | 실행 항목 | Owner | 완료 기준 |
| --- | --- | --- | --- |
| 일간 | 핵심 API 상태, 알림 backlog 확인 | OKR 어드민 | 이상 징후 0건 또는 조치 등록 |
| 주간 | 실험 매핑/상태 리뷰, Audit/Decision 로그 점검 | PM/도메인 리드 | 리뷰 코멘트 기록 완료 |
| 월간 | 월 실적 입력/정정, red/yellow 대응 | 도메인 PM | 월 실적 입력 완료율 100% |
| 반기 | 목표 구조/정의 정비, 회고 및 개선 과제 등록 | 리더십 + 도메인 리드 | 반기 회고/개선 과제 확정 |

## 5. 월간 운영 런시트 (M1~M12)
| 순서 | 단계 | 작업 | 검증 포인트 | Owner |
| --- | --- | --- | --- | --- |
| 1 | 월초 준비 | Notifications 미등록 건/조직/owner 확인 | 누락 대상 리스트 확정 | 도메인 PM |
| 2 | 실적 입력/정정 | 월 실적 upsert, 필요 시 Total Table 월업서트 | 미래월 입력 차단 없이 정상 저장 | 도메인 PM |
| 3 | 상태 점검 | Executive/Domain/Review에서 red/yellow 우선 정리 | 우선 대응 대상 지정 | PM/도메인 리드 |
| 4 | 실험 점검 | 단일 타깃 매핑 정책 준수 확인 | 정책 위반 0건 | PM/도메인 리드 |
| 5 | 인풋 backlog 정리 | `registered` 우선 처리, convert/reject 사유 기록 | 미결정 backlog 감소 | Input 운영 담당 |
| 6 | 로그 리뷰 | Audit/Decision 로그 점검 및 보강 | actor/reason 누락 0건 | OKR 어드민 |

## 6. 반기 운영 런시트 (H1/H2)
| 단계 | 작업 | 확인 포인트 | Owner |
| --- | --- | --- | --- |
| 반기 시작 | Objective 반기/연도/조직/도메인 정합성 점검 | preset 조직체계와 일치 | PM/도메인 리드 |
| 반기 중 | 목표 수정 이력 관리, 대규모 변경 리뷰 기록 | 변경 사유와 근거 추적 가능 | PM/도메인 리드 |
| 반기 종료 | KR/Sub-KR/Initiative 달성률 확정, 실험 회고 | 다음 반기 개선 과제 등록 완료 | 리더십 + 도메인 리드 |

---

## 7. 장애/예외 대응 플레이북
| 유형 | 대표 에러/징후 | 의미 | 즉시 조치 |
| --- | --- | --- | --- |
| Validation 오류 | `only one mapping target...`, `yearMonth cannot be in the future`, `goalType must be...` | 요청값 정책 위반 | 입력값 수정 후 재요청 |
| Conflict 오류 | 삭제 API 409 | 의존 관계 존재 | 하위/연결 엔티티 정리 후 재시도 |
| Preset 오류 | taxonomy/preset API 503 | 필수 preset 누락 | `missingPresetTypes` 확인 후 preset 복구 |
| Sync/부팅 오류 | 부팅 실패, 500 동기화 오류 | Supabase env 누락 또는 동기화 실패 | env 복구 -> 재기동 -> audit/row 대조 |

## 8. 백업/복구 기준
| 항목 | 기준 |
| --- | --- |
| 백업 주기 | Supabase 스냅샷 일 1회 |
| 복구 리허설 | 월 1회 |
| 복구 목표 | 핵심 API(health/taxonomy/notifications/okr-table) 30분 내 정상화 |

## 9. 운영 KPI 대시보드
| KPI | 목표 | 경보 조건 | 대응 리드타임 |
| --- | --- | --- | --- |
| 월 실적 입력 완료율 | 100% | 목표 미달 | 영업일 내 보정 |
| Notifications 미등록 backlog | 지속 감소 | 급증 추세 | 영업일 2일 이내 |
| 감사로그 유효율 | 100% | 누락 발생 | 당일 보정 |
| 삭제 충돌 해결 리드타임 | 영업일 1일 이내 | SLA 초과 | 즉시 escalation |
| 주요 API 오류율 | 1% 미만 | 임계치 초과 | 즉시 원인 분석/조치 |

---

## 10. 운영 체크시트
### 10.1 시작 점검
- [ ] `GET /api/health` 200
- [ ] `GET /api/admin/taxonomy` 200
- [ ] Notifications 미등록 backlog 확인 및 소유자 지정

### 10.2 주간 점검
- [ ] 실험 단일 타깃 매핑 정책 준수 확인
- [ ] Input convert/reject 규칙 준수 확인
- [ ] Audit/Decision 로그 점검 완료

### 10.3 월말 점검
- [ ] Total Table CSV export 정상
- [ ] row 월업서트 동작 확인
- [ ] 월 실적 누락 0건 확인

## 11. 변경 이력
| 날짜 | 버전 | 변경 내용 |
| --- | --- | --- |
| 2026-02-14 | v1.0.0 | 초기 Operations Runbook 작성 |
| 2026-02-22 | v1.2.0 | Notifications/Total Table 운영 절차, 실험 단일 타깃 정책, Preset 503/부팅 실패 대응, KPI/체크리스트 업데이트 |
| 2026-02-23 | v1.2.0 | 권한 모델 정정: Experiment 운영 책임을 PM/도메인 리드로 명확화 |
| 2026-02-23 | v1.3.0 | 기준 문서를 통합본으로 전환 |
| 2026-02-23 | v1.3.0 | 표/런시트/체크시트 중심 형식으로 가독성 개선 |
