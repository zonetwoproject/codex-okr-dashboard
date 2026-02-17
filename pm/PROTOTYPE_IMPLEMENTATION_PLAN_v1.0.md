# OKR Dashboard Prototype Implementation Plan v1.0

작성일: 2026-02-14

## 추가가 필요한 계획 (Step 7~10)
기존 1~6단계는 설계/정의 중심이므로, 실제 동작 결과를 위해 아래 4단계를 추가한다.

## Step 7. 기술 스택/범위 고정
- 스택: Node.js + Express + Vanilla JS
- 데이터 저장: JSON 파일 기반(프로토타입 목적)
- 범위: Objective/KR/Experiment/Link/Monthly/Audit + KR Detail Dashboard

## Step 8. 백엔드 구현
- OpenAPI 핵심 엔드포인트 구현
- 유효성 검증(반기 필수, KR 필수 필드, weight 범위)
- 월 실적 upsert 및 AuditLog 기록

## Step 9. 프론트엔드 구현
- 단일 페이지 대시보드
- KR 목록/상세, 기여도 바 시각화, 월 실적/로그 표시
- 샘플 입력 폼(실험 추가, 실적 upsert)

## Step 10. 검증/데모 패키지
- seed 데이터 스크립트
- 스모크 테스트 스크립트
- 데모 가이드(실행 방법/시나리오/한계)

## 완료 정의
- `npm run dev`로 서버/화면 실행 가능
- KR 상세에서 달성률 + 기여 실험 계산이 실시간 확인 가능
- `npm run smoke`로 핵심 API 시나리오 검증 가능
