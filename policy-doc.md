# OKR Dashboard 정책 문서

**문서 메타데이터**  
- 저장소/경로: `codex-okr-dashboard/` (GitHub: zonetwoproject/codex-okr-dashboard)  
- 대상 독자: PM 및 각 조직 관리자, 전사 OKR 어드민, 플랫폼·백엔드 엔지니어, 데이터/실험 운영 부서, QA  
- 참조 원본: `PROJECT_MASTER_SPEC_v1.0.md`, `architecture/ERD_AND_DATA_RULES_v1.0.md`, `architecture/openapi.yaml`  
- 추가 지시: 한국어, 노션 호환 Markdown, 전사 OKR 운영 관점 반영, 검증 로그·리뷰 체크리스트 제외

---

## 1. 문제 정의
- **단일 진실 소스 부재**로 목표·이니셔티브·실험 데이터가 분리되어 목표-실행-성과 인과가 끊어진다.  
- **수기·비표준 운영**으로 반기/분기 OKR, 실험 연동, 월 실적 입력에서 오류·지연·책임 불명확이 발생한다.  
- **변경 추적 취약**: 목표·임계값·상태 변경 시 이유/작성자/영향 범위를 자동 보관하지 못해 감사 대응이 어렵다.  
- **고객(사용자) 시각 부재**: 리더십·팀원이 KPI를 한눈에 볼 UI가 없어 의사결정이 늦어진다.

---

## 2. 해결 방안 개요

### 2.1 제품 전략
- Objective → KR → Sub-KR → Initiative 구조를 **월별 실적**, **실험 데이터** 등과 연결해 목표-실험-성과를 단일 체계로 본다. 
- OKR 대시보드, 목표·이니셔티브, Input 관리까지 한 시스템에서 처리한다.

### 2.2 페이지/기능 계층 (내비게이션 기준)
| 사이드 메뉴 그룹 | 화면 이름 | 설명 |
| --- | --- | --- |
| 대시보드 | Executive | 전사 KPI 신호등·추세 카드, 도메인 진입점 |
| 대시보드 | Domain | Domain/Team 필터와 KR 리스트, 세부 페이지로 이동 |
| 대시보드 | Review | Review/Audit 이력 요약 |
| 대시보드 | Total Table | OKR·Initiative 통합 표(검색/필터 포함) |
| 목표/이니셔티브 | Objective | 반기별 Objective 목록·생성 |
| 목표/이니셔티브 | KR | KR/Sub-KR 목록·생성 |
| 목표/이니셔티브 | Initiative | Initiative 진행률·상태 관리 |
| 목표/이니셔티브 | Experiment | 실험 목록·생성 (기본 메타데이터 입력) |
| 인풋 대시보드 | Input | Input 등록, 목록 필터링, 과제화 여부 결정 |
| 관리 | Preset | 권한·조직 구조·환경값 관리 |
| 관리 | Audit Logs | 감사 로그 리스트, actor/reason/변경 값 확인 |

### 2.3 사용자 여정 (요약)
1. **조직 관리자(PM/도메인 리드)**: 대상 반기를 선택 → Objective/KR/Initiative 생성 → KPI·임계값·책임자 지정 → 필요 시 실험 링크/월 실적 업데이트.  
2. **인풋 운영 부서**: Input source 등록, 분류/프로덕트/소스 기준으로 정리 후 과제화 여부(목표 연결/반려) 결정.  
3. **전사 OKR 어드민**: 권한/정책 설정, 조직 마스터·반기 구조 동기화, 감사 로그 모니터링.  
4. **리더십/팀원**: Dashboard에서 KPI 신호·실험 기여도를 조회하고 Review Board에서 변경 이력을 확인.

---

## 3. 세부 스펙

### 3.1 입력 필드 (주요 API)
| 엔티티/엔드포인트 | 필수 필드 | 타입/제약 | 비고 |
| --- | --- | --- | --- |
| Objective (`POST /api/objectives`) | half(H1/H2), year, title, teamId, actor, reason | half enum, year int | owner optional |
| Key Result (`POST /api/krs`) | objectiveId, title, metricType, unit, targetValue, actor, reason | metricType/unit string, targetValue number | 신호등은 후속 계산 |
| Experiment (`POST /api/experiments`) | title, aarrrTag(enum 5종), actor, reason | status enum, owner optional | AARRR 단일 선택 |
| KR-Experiment Link (`POST /api/kr-experiment-links`) | krId, experimentId, 가중치(0~100), actor, reason | rationale optional | 가중치는 실험 기여 비중 |
| Monthly Performance (`POST /api/monthly-performances/upsert`) | 대상 종류(targetType: objective/kr/initiative), 대상 ID(targetId), 집계 월(yearMonth: YYYY-MM), 실제 값(actualValue), 소스 종류(sourceType: manual/synced/calculated), 작성자(actor), 사유(reason), 비고(note, optional) | 월별 실적 기록 |
| Input Source (`POST /api/input-sources`) | 인풋 제목(title), 상세(detail), 등록 부서(team), 분류(classification), 프로덕트(product), 소스(source), 작성자(actor), 사유(reason), 배포 필요일(deployBy, optional), 참고 링크(referenceUrl, optional) | 분류/프로덕트/소스는 Preset 값 사용 | 인풋 등록 |
| Input Process (`POST /api/input-sources/:id/process`) | 결정 유형(decision: convert/reject), 연결 대상(goalType+goalId로 KR/Sub-KR/Initiative 지정 또는 legacy initiativeId), 반려 사유(rejectionReason, reject 시), 상태(status, optional), 작성자(actor), 사유(reason) | convert 시 목표를 지정해야 하며, reject 시 반려 사유 필수 | 인풋을 KR/Initiative 연결 또는 반려 |

### 3.2 유효성 검사
| 조건 | 결과/오류 | 트리거 |
| --- | --- | --- |
| half 값이 H1/H2가 아님 | 400 Validation error | Objective 생성 |
| metricType/unit 누락 | 400 Validation error | KR 생성 |
| 가중치 <0 또는 >100 | 400 Validation error | KR-Experiment 링크 |
| yearMonth 형식 불일치 | 400 Validation error | Monthly upsert |
| actor/reason 누락 | 요청 거부 | 모든 쓰기 API |
| 반기 미지정 | 저장 금지 | Objective/KR 로직 |
| 월 실적 중복키 | 기존 row update | Monthly upsert |

### 3.3 실시간 피드백
- KR Detail 화면은 저장된 월 실적을 불러와 달성률·신호등을 표시하며, 월 실적을 갱신하면 재조회 시 최신 계산값이 반영된다.
- 가중치 범위(0~100)는 서버에서 검증하며, UI에서는 별도 경고 없이 저장 요청 시 에러로 처리된다.
- 월 실적 입력 폼은 source_type 값에 따라 노트 필드 표시 여부를 제어한다.

### 3.4 계산 로직
| 변수(한글/영문) | 수식 | 설명 |
| --- | --- | --- |
| 달성률(achievement) | `min(100, (actual_sum / target_value) * 100)` | KR 달성률 |
| 신호등(signal) | Green≥80 / Yellow≥50,<80 / Red<50 | 공통 임계값 |
| 기여 점수(contribution_score) | `achievement * (가중치 / 가중치 합)` | 실험 기여 점수 |
| 가중치 합(weight_sum) | 연결된 가중치 합 | 0이면 점수 계산 중단 |
| 월 실적 upsert 키(monthly_upsert_key) | `(target_type, target_id, year_month)` | 충돌 시 update |

### 3.5 데이터 흐름
| 단계 | 출발/도착 | 설명 | 검증 |
| --- | --- | --- | --- |
| 1 | 실험 플랫폼 → Experiment API | 실험 메타 생성, AARRR 태그 포함 | enum·actor/reason |
| 2 | KR-Experiment Link API | 가중치·rationale 입력, 연결 레코드 생성 | 가중치 범위 |
| 3 | 월 실적 수집 → Upsert API | manual/synced/calculated 구분 | schema + upsert key |
| 4 | Aggregation | actual_sum 계산, achievement·signal 산출 | 계산 규칙 |
| 5 | Dashboard API (`/api/dashboard/kr/{krId}`) | KR·progress·contributions·monthly payload 제공 | OpenAPI schema |
| 6 | AuditLog | entity 변경 이벤트 저장 | actor/reason, before/after |

### 3.6 출력/대시보드 구성 (이해 용이 버전)
- **KR Detail 화면**: 상단 카드(제목/목표값/metric/unit/신호등) → Progress 카드(actual 합계·달성률·신호등) → 실험 기여 표(실험 ID/제목, 가중치, 정규화 가중치, contributionScore) → 월 실적 타임라인(yearMonth·actualValue·sourceType).
- **Executive/Domain Dashboard**: 영역별 KPI 신호등 카드, drill-down 버튼, Domain/Team 필터.
- **Review Board**: Decision/Audit 로그 타임라인, 사유/actor 강조.
- **Admin/Preset 화면**: Objective/KR/Initiative/Experiment 리스트 + Create 폼, 가중치 입력 모달, Monthly upsert 폼, Input 목록·등록 모달, Preset(도메인/조직/분류) 설정.

### 3.7 설정·상수 (설명 중심)
- **기간 단위**: 반기(H1/H2) 기반, 분기/월 실적은 파생.
- **신호등 임계값**: Green≥80, Yellow≥50,<80, Red<50.
- **실험 가중치**: 0~100 범위, 가중치 합을 이용해 기여도를 계산.
- **월 실적 입력 source_type**: manual, synced, calculated.
- **가용성·성능 목표**: 99.9% 가용성, 대시보드 응답 P95 3초.
- **Audit 정책**: soft-delete, actor/reason, before/after 필수 저장.

### 3.8 UI 구조 & 페이지 하이어라키
```
Sidebar
├─ Dashboard
│  ├─ Executive
│  ├─ Domain
│  ├─ Review
│  └─ Total Table
├─ 목표/이니셔티브
│  ├─ Objective
│  ├─ KR (세부 포함)
│  ├─ Initiative
│  └─ Experiment
├─ Input
└─ 관리
   ├─ Preset
   └─ Audit Logs
```
- 접근: Admin(정책/권한), Leadership(Review/승인), 조직 관리자(PM/팀장), 인풋 운영 부서, 팀원.

### 3.9 이벤트/사용자 흐름
| 사용자 액션 | 시스템 반응 | 비고 |
| --- | --- | --- |
| Objective/KR 생성 | 필수 필드 저장, Audit 기록 | actor/reason 필수 |
| 실험 가중치 조정 | KR-Experiment Link 업데이트 → `가중치_sum` 재계산, normalized가중치·contributionScore 갱신 | 실험 기여 비중 조절 |
| 월 실적 업서트 | 월 실적 기록 upsert, updated_at 갱신 | manual/synced/calc 구분 |
| Dashboard 호출 | progress·contributions 계산 후 응답 | OpenAPI 준수 |
| Audit 이벤트 | before/after JSON 저장, Review Dashboard 반영 | 핵심 변경 |

### 3.10 도메인 용어
| 용어 | 정의 |
| --- | --- |
| Objective | 반기 단위 팀 목표 |
| Key Result | Objective 하위 측정 가능한 지표 |
| Sub-KR | KR 세분화 항목 |
| Initiative | Sub-KR 실행 과제, 진행률(정량) + 상태점수(정성) |
| Experiment | 이니셔티브/가설 검증 실험, AARRR 태그 보유 |
| 월 실적 기록 | 목표/지표/이니셔티브의 월별 실적 기록 |
| AuditLog | actor, reason, before/after 상태를 저장하는 감사 엔티티 |
