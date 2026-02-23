# OKR Admin Internalization Build & Go-live Runbook v0.4

> 프로토타입을 참고해 구축한 신규 OKR Admin을 실제 운영에 오픈하기 위한 실행 런북

## 문서 메타
| 항목 | 내용 |
| --- | --- |
| 작성일 | 2026-02-23 |
| 문서 버전 | v0.4 |
| 대상 | 신규 내부 OKR Admin 서비스 런칭 |
| 적용 범위 | 구축 완료 검증, 서비스 오픈, fallback, hypercare |
| 운영 방식 | 기존 어드민 병행 운영 없이 신규 어드민 단일 오픈 |
| 참조 문서 | `/Users/ungs2/Documents/100. Projects/codex-okr-dashboard/docs/INTERNALIZATION_TRANSITION_BLUEPRINT_v0.1.md` |

---

## 1. Go-live 목표
| 목표 | 설명 | 성공 기준 |
| --- | --- | --- |
| 서비스 오픈 안정성 | 오픈 시점 핵심 기능 정상 제공 | 핵심 API/화면 즉시 검증 통과 |
| 데이터 정합성 | 오픈 기준 데이터 정확성 확보 | row count/핵심 집계/샘플 검증 통과 |
| fallback 가능성 | 문제 시 안전하게 오픈 중단/복구 가능 | fallback 드릴 기준 충족 |

## 2. 런칭 범위 (In / Out)
| 구분 | 항목 |
| --- | --- |
| In Scope | 신규 API(`/v1/*`) 및 신규 어드민 UI 오픈 |
| In Scope | 초기 운영 데이터 적재, 권한/감사/알림 검증 |
| In Scope | 오픈 후 24~72시간 hypercare 운영 |
| Out of Scope | 런칭과 무관한 신규 기능 개발 |

---

## 3. 역할 및 의사결정 체계
| 역할 | 주요 책임 | 백업 | 최종 승인권 |
| --- | --- | --- | --- |
| Launch Lead | 전체 진행 통제, Go/No-Go 판단 주관 | PM Lead | Yes |
| DB Owner | 스키마/데이터 적재/정합성 검증 | Data Eng | No |
| API Owner | 릴리즈/헬스체크/에러 대응 | Backend Eng | No |
| QA Owner | 핵심 시나리오 검증 | QA Eng | No |
| Comms Owner | 공지/상태 업데이트/문의 응대 | Ops | No |

## 4. 사전 준비 체크리스트 (D-7 ~ D-1)
| 영역 | 작업 항목 | 완료 기준 | Owner | 상태 |
| --- | --- | --- | --- | --- |
| 환경 | 내부 DB 스키마 배포 완료 | 스키마 버전 태깅 확인 | DB Owner | [ ] |
| 환경 | 내부 API 스테이징/프리프로덕션 배포 | `/v1/health` 200 | API Owner | [ ] |
| 보안 | SSO/RBAC 최소권한 검증 | 역할별 접근 시나리오 통과 | API Owner | [ ] |
| 데이터 | 초기 데이터 적재 dry-run 2회 이상 | dry-run 결과 리포트 확보 | DB Owner | [ ] |
| 데이터 | row count/집계/샘플 대조 | 허용 오차 기준 충족 | DB Owner | [ ] |
| 운영 | 모니터링/알람 룰 준비 | 대시보드 + 알람 연동 확인 | Ops | [ ] |
| 운영 | 온콜/연락망 확정 | 대응 채널 및 담당자 공지 | Launch Lead | [ ] |
| 커뮤니케이션 | 공지 템플릿 준비 | 시작/완료/지연/중단 템플릿 확정 | Comms Owner | [ ] |

---

## 5. Go-live 당일 실행 런시트 (T0)
| 순서 | 단계 | 실행 작업 | 검증 포인트 | Owner | 증적 |
| --- | --- | --- | --- | --- | --- |
| 1 | 오픈 시작 공지 | 영향 범위/예상시간/문의 채널 공지 | 공지 전파 확인 | Comms Owner | 공지 링크 |
| 2 | 변경 잠금 | 스키마/배포 변경 잠금 선언 | 잠금 시작 시각 기록 | Launch Lead | 로그/스크린샷 |
| 3 | 초기 데이터 반영 | 런칭 기준 데이터 적재 및 보정 | 적재 완료 시각 기록 | DB Owner | 적재 리포트 |
| 4 | 최종 검증 | row count + 핵심 API + 핵심 화면 검증 | Go/No-Go 체크 통과 | QA Owner | 검증 체크시트 |
| 5 | 서비스 오픈 | 신규 어드민 접근 오픈 및 라우팅 적용 | 오픈 후 핵심 시나리오 즉시 통과 | API Owner | 배포 로그 |
| 6 | 오픈 완료 공지 | 오픈 완료/알려진 이슈/대응창구 공지 | 공지 확인 | Comms Owner | 공지 링크 |

## 6. Go / No-Go Gate
| 항목 | 검증 방법 | 통과 기준 | 결과 |
| --- | --- | --- | --- |
| API health | `GET /v1/health` | 200 | [ ] |
| 인증/권한 | 3개 이상 role 시나리오 | 권한 누락/과권한 없음 | [ ] |
| Preset 조회 | `GET /v1/admin/presets` | 200 + 필수 preset 존재 | [ ] |
| Notifications 정합성 | `registered/missing` 비교 | 기준 데이터와 일치 | [ ] |
| 월 실적 업서트 | 월 실적 입력/수정 | 성공 + 감사로그 생성 | [ ] |
| 실험 매핑 | 단일 타깃 매핑 시나리오 | 정책대로 동작 | [ ] |
| 감사로그 | `GET /v1/audit-logs?limit=20` | 누락 없음 | [ ] |

---

## 7. Fallback 계획
| 트리거 | 즉시 조치 | 후속 조치 | Owner |
| --- | --- | --- | --- |
| 인증/권한 치명 오류 | 신규 어드민 접근 즉시 제한 | 원인 분석 후 패치 배포 | API Owner |
| 핵심 API 오류율 급증 | 오픈 중단 + 마지막 안정 릴리즈로 복귀 | 에러 패턴 분석/재오픈 일정 수립 | Launch Lead |
| 정합성 불일치 미해결 | 쓰기 기능 제한 + 데이터 보호 스냅샷 생성 | diff 원인 분석/재적재 계획 | DB Owner |

## 8. Hypercare (오픈 후 24~72시간)
| 모니터링 항목 | 목표/임계치 | 점검 주기 | 이상 시 액션 |
| --- | --- | --- | --- |
| API 오류율 | 임계치 미만 유지 | 30분 | 오류 endpoint 우선 복구 |
| p95 지연시간 | 임계치 미만 유지 | 30분 | 느린 쿼리/API 튜닝 |
| DB 연결 에러 | 0 또는 기준 이하 | 30분 | 풀/네트워크/리소스 점검 |
| Notifications backlog | 급증 없음 | 일 2회 | 원인 파악 및 배치 보정 |
| 감사로그 누락 | 0건 | 일 2회 | 누락 경로 복구/보정 |

---

## 9. 커뮤니케이션 템플릿
### 9.1 오픈 시작 공지
```text
[Go-live 시작] 신규 OKR Admin 서비스 오픈 절차를 시작합니다.
- 영향 범위: 오픈 준비/검증 진행
- 예상 시간: HH:MM ~ HH:MM
- 문의 채널: #okr-admin-ops
```

### 9.2 오픈 완료 공지
```text
[Go-live 완료] 신규 OKR Admin 서비스 오픈이 완료되었습니다.
- 완료 시각: HH:MM
- 현재 상태: 정상 운영
- 알려진 이슈: 없음/상세 기재
```

### 9.3 오픈 중단 공지
```text
[Go-live 중단] 안정성 이슈로 신규 서비스 오픈을 일시 중단합니다.
- 중단 시각: HH:MM
- 원인 요약: ...
- 다음 공지 예정: HH:MM
```

## 10. Postmortem 체크리스트
| 항목 | 기록 내용 |
| --- | --- |
| 계획 대비 실제 소요시간 |  |
| 장애/경보 발생 건수 |  |
| 정합성 이슈 및 해결 내역 |  |
| 문서/자동화 보완 항목 |  |
| 다음 런칭 개선 액션 |  |

---

## 11. 참조 산출물
| 유형 | 경로 |
| --- | --- |
| Blueprint | `/Users/ungs2/Documents/100. Projects/codex-okr-dashboard/docs/INTERNALIZATION_TRANSITION_BLUEPRINT_v0.1.md` |
| 내부 API 스펙 초안 | `/Users/ungs2/Documents/100. Projects/codex-okr-dashboard/architecture/internal-openapi-draft-v0.1.yaml` |
| 내부 DB DDL 초안 | `/Users/ungs2/Documents/100. Projects/codex-okr-dashboard/architecture/internal-db-schema-draft-v0.1.sql` |

## 12. 변경 이력
| 날짜 | 버전 | 변경 내용 |
| --- | --- | --- |
| 2026-02-23 | v0.1 | 초기 내부화 런북 작성 |
| 2026-02-23 | v0.2 | 표/체크시트 중심 형식으로 가독성 개선 |
| 2026-02-23 | v0.3 | 병행 운영 전제 제거, 단일 오픈 방식으로 정합화 |
| 2026-02-23 | v0.4 | 신규 어드민 구축/Go-live 관점으로 전면 재정렬 |
