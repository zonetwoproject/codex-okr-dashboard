# OKR Dashboard Master Spec (PM)

작성일: 2026-02-14  
작성자: planner(pm 🤔)  
적용 범위: `okr-dashboard` 프로젝트 전체

---

## 1) 문서 목적

이 문서는 **다른 AI/엔지니어가 단독으로 읽어도** 아래를 파악할 수 있도록 작성된 마스터 스펙이다.

- 제품 목표/범위
- 확정 정책(비협상 + 의사결정)
- 핵심 데이터/도메인 구조
- 기능/권한/연동/운영 규칙
- 현재 진행 상태와 산출물 위치

---

## 2) 핵심 원본 문서(SoT)

### 2.1 PRD 확정본 (최우선)
- `docs/PRD_FULL_SPEC_v1.1_FINAL.md`

### 2.2 참고 이력
- `docs/PRD_DRAFT_v0.1.md`
- `docs/PRD_FULL_SPEC_v1.0.md`

> 원칙: 상세 요구사항 충돌 시 `PRD_FULL_SPEC_v1.1_FINAL.md`를 우선한다.

---

## 3) 제품 정의 (요약)

- 제품명: OKR Dashboard
- 목표: 조직형 OKR + Initiative + Experiment 운영의 단일 시스템화
- 운영 단위: Domain → Division(실) → Team
- 기간 단위: 반기(H1/H2), 분기(1Q~4Q), 월 실적

핵심 문제:
1. OKR 계층과 실험 데이터 분리
2. 수기 중심 운영으로 인한 비효율
3. 변경 이력/책임 추적 취약

---

## 4) 비협상 요구사항 (Non-negotiable)

1. 실험 ↔ KR 연결 구조
2. KR 단위 기여 실험 자동 집계
3. KR 달성도 기여 실험 시각화
4. 수기 입력 최소화(연동 우선)

---

## 5) 확정 의사결정(2026-02-14)

1. AARRR 태그: 단일 선택
2. Initiative 달성률: 혼합(정량 + 상태점수)
3. 실험 기여도(weight): 수동 입력
4. 반기 중 목표 수정: 자유 수정(이력 필수)
5. 반기 생성: 선택 복제
6. 월별 실적: 수기 입력 기본
7. KR 신호등 임계값: 공통 임계값
8. 실험 결과 KR 반영: 실시간

---

## 6) 핵심 도메인 모델(요약)

- Goal hierarchy: Objective → KR → Sub-KR → Initiative
- Experiment linkage: KR N:M Experiment (via KRExperimentLink)
- Performance: MonthlyPerformance(target_type, target_id, year_month, actual_value)
- Governance: DecisionLog, AuditLog 필수

핵심 무결성:
- 반기 미지정 저장 금지
- KR metric_type/unit 필수
- 월 실적 중복 입력은 upsert
- 삭제는 soft-delete + 참조 무결성 검증

---

## 7) 기능 범위(요약)

1. 목표/이니셔티브 관리
- 반기 템플릿 생성, 선택 복제, CRUD

2. 인풋/우선순위 관리
- Input source, 리뷰 상태, RICE

3. 대시보드
- Executive / Domain / KR Detail / Review

4. 검색/필터
- 기간/조직/AARRR/상태/담당자

---

## 8) 권한 정책(요약)

- Admin: 정책/권한/마스터
- Leadership: 승인/리뷰
- PM: 목표/이니셔티브 운영
- Team Member: 실적/코멘트
- Analyst: 실험/지표 연동

감사 정책:
- 목표값/정의/상태/연결 변경 전후값 저장
- actor/reason/timestamp 필수

---

## 9) 연동 정책(요약)

- 대상: 실험 플랫폼, DWH/BI, 조직 마스터
- 방식: Pull 배치 + 이벤트 혼합
- 실패: 재시도 + 지연 큐 + 수기 fallback
- source_type: manual / synced / calculated

---

## 10) NFR

- 대시보드 P95 3초 이내
- 가용성 99.9%
- 백업 일 단위 + 복구 리허설

---

## 11) 현재 구현/운영 상태

완료:
- PRD v1.1 Final 확정
- 멀티 에이전트 운영 체계(leader 중심 on-demand)
- Figma MCP 읽기 연동 정상화(조회/데이터 추출)

진행중:
- Figma 쓰기(생성/수정) 경로 검토 및 PoC
- Sprint 1 이슈 분해/착수

리스크:
- Figma 쓰기는 현 read-only MCP로 불가(플러그인 브리지 또는 write MCP 필요)

---

## 12) 에이전트 작업 정책 (프로젝트 공통)

- 문서 생성/수정은 프로젝트 로컬 폴더에서 수행한다.
- Notion 문서 작업은 사용자의 명시 지시가 있을 때만 수행한다.

권장 폴더:
- `docs/`: 공식 스펙/PRD/런북
- `pm/`: 기획 운영 문서/로드맵/백로그 기준서
- `architecture/`: ERD/API/시퀀스

---

## 13) 다음 액션 제안 (PM)

1. Sprint 1 백로그(10~15개) 확정 문서화
2. ERD 상세 + API OpenAPI 초안 작성
3. KR 실험기여 시각화 와이어프레임 정의
4. 운영 Runbook(월간/반기) 작성

---

## 14) 변경 이력

- 2026-02-14: v1.0 초안 생성 (PRD v1.1 기준 마스터 스펙 정리)
