# OKR Dashboard 운영 가이드

## 1. 개요
- **대상**: 전사 OKR 어드민, 각 도메인 PM/리드, 인풋 운영 부서, 실험 담당자
- **목적**: 어드민 메뉴별 운영 책임자와 입력/갱신 항목, 시기별 체크리스트를 정리해 일관된 운영 보장
- **활용**: 사내 위키/Notion에 붙여넣어 운영 기준 문서로 사용

## 2. 대시보드 영역 운영
| 운영 요소 | 주요 작업 | 책임자 | 입력/업데이트 포인트 |
| --- | --- | --- | --- |
| Executive | 전사 KPI 신호등·추세 확인, Domain drill-down | 전사 OKR 어드민, 리더십 | 별도 입력 없음. 월 실적·실험 가중치가 최신인지 확인 |
| Domain | Domain/Team 필터로 KPI·KR 상세 확인 | 각 Domain 리드/PM | Preset의 Domain/Team 값이 최신인지 점검 |
| Review | Review/Audit 이력 확인 | 리더십, OKR 어드민 | CRUD 시 actor/사유 입력이 정확해야 Review에 반영 |
| Total Table | OKR/Initiative 통합 검색·필터 | PM·분석가 | 데이터는 자동 집계, 입력 없음 |

> 월/분기 리뷰 전 Domain 리드는 최신 월 실적과 실험 가중치가 반영됐는지 다시 확인한다.

## 3. 목표/이니셔티브 메뉴 운영
### 3.1 Objective
- **책임자**: 각 Domain PM/리드
- **입력 값**: 반기(half), 연도(year), 목표명(title), 담당 팀(teamId), 책임자(owner/선택), 작성자(actor), 입력 사유(reason)
- **주의**: 반기별로 직접 생성하며 soft-delete만 허용. 삭제 대신 상태 관리 권장.

### 3.2 KR / Sub-KR
- **책임자**: Domain PM, KR 담당자
- **입력 값**: 상위 Objective ID(objectiveId), KR 이름(title), 측정 지표(metricType), 단위(unit), 목표값(targetValue), 작성자(actor), 사유(reason)
- **주의**: metricType·unit·targetValue 누락 시 저장 불가. 신호등 임계값(80/50)은 공통으로 자동 계산됨.

### 3.3 Initiative
- **책임자**: 각 실행 팀장/담당자
- **입력 값**: 제목(title), 진행률(progress_quant), 상태 점수(status_score), 소속 Sub-KR(subKrId), 작성자(actor), 사유(reason)
- **주의**: 리뷰 주기에 맞춰 진행률/상태 점수를 갱신해 최신 상태를 유지.

### 3.4 Experiment
- **책임자**: 실험 담당 PM/데이터 분석가
- **입력 값**: 실험명(title), AARRR 태그(aarrrTag), 상태(status), 책임자(owner/선택), 작성자(actor), 사유(reason)
- **주의**: Experiment Admin 화면에서 생성/수정하며 aarrrTag·status는 드롭다운 선택.

## 4. 실험-OKR 연결(가중치)
| 작업 | 위치 | 책임자 | 입력 값 |
| --- | --- | --- | --- |
| 실험 연결/가중치 입력 | KR Detail → Experiment Linker | KR 담당 PM + 실험 소유자 | KR ID, 실험 ID, 가중치(weight 0~100), 근거(rationale), 작성자(actor), 사유(reason) |

- 가중치 합이 0이면 기여도 계산이 중단되므로 최소 1개 실험에 가중치 부여.
- UI 경고가 없으니 저장 전 가중치/근거 재확인.
- 저장 후 KR Detail을 다시 열어 정규화 가중치·기여 점수 갱신 여부를 확인.

## 5. 월 실적 입력
- **책임자**: 각 팀 PM 또는 데이터 담당자
- **위치**: 월 실적 입력 폼(내부 UI) 또는 `POST /api/monthly-performances/upsert`
- **입력 값**: 대상 종류(targetType: objective/kr/initiative), 대상 ID(targetId), 집계 월(yearMonth), 실제 값(actualValue), 소스 종류(sourceType: manual/synced/calculated), 비고(note, 선택), 작성자(actor), 사유(reason)
- **운영 규칙**:
  - 월 마감 직후 입력해 KPI 계산 지연 방지
  - 동일 키(targetType+targetId+yearMonth)는 upsert이므로 재입력 시 기존 값 덮어씀
  - sourceType으로 데이터 출처(수기/연동/계산)를 명확히 남긴다

## 6. 인풋(Input) 운영
### 6.1 등록
- **책임자**: 인풋 운영 부서
- **입력 값**: 인풋 제목(title), 상세(detail), 분류(classification), 프로덕트(product), 소스(source), 등록 부서(team), 작성자(actor), 사유(reason), 배포 필요일(deployBy, 선택), 참고 링크(referenceUrl, 선택)
- **주의**: 분류/프로덕트/소스 값은 Preset 화면에서 미리 관리되어 있어야 드롭다운에 노출.

### 6.2 과제화 결정
- **위치**: Input 목록 → “과제화 여부 선택”
- **입력 값**: 결정 유형(decision: convert/reject), 연결 목표(goalType+goalId로 KR/Sub-KR/Initiative 지정 또는 legacy initiativeId), 반려 사유(rejectionReason, reject 시 필수), 상태(status, 선택), 작성자(actor), 사유(reason)
- **주의**: convert 시 반드시 목표 지정, reject 시 반려 사유 필수. status를 `registered → converted/rejected`로 관리.

## 7. Preset / Audit Logs
| 화면 | 책임자 | 관리 항목 | 운영 메모 |
| --- | --- | --- | --- |
| Preset | 전사 OKR 어드민 | Domain, Division, Team, Input 분류·프로덕트·소스 | 조직 개편 시 즉시 업데이트, 팀-실 매핑 유지 |
| Audit Logs | OKR 어드민·리더십 | actor, reason, before/after, timestamp 조회 | CRUD 시 actor·사유를 정확히 입력해야 로그가 유효 |

## 8. 운영 체크리스트
| 시점 | 체크 항목 | 담당 |
| --- | --- | --- |
| 월 종료 직후 | 월 실적 입력 및 sourceType 기록 | 각 팀 PM/데이터 담당 |
| 실험 종료/변경 시 | 가중치 및 근거 업데이트 | KR 담당 PM + 실험 소유자 |
| 분기/반기 시작 전 | Objective/KR/Initiative 생성·책임자 지정 | 도메인 PM |
| 인풋 정기 검토 | 미결정 인풋 검토, 과제화 여부 결정 | 인풋 운영 부서 |
| 조직 구조 변경 시 | Preset(도메인/팀/분류) 최신화 | 전사 OKR 어드민 |
| 리뷰 준비 | Dashboard 수치·Audit 로그 이상 여부 확인 | OKR 어드민 + 리더십 |
