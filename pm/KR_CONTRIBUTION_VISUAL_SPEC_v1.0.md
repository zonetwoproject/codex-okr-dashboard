# KR 기여도 시각화 명세 v1.0

작성일: 2026-02-14

## 1. 목적
KR 달성도와 연결된 실험의 기여도를 한 화면에서 확인하고, 리뷰 시 즉시 의사결정 가능하도록 한다.

## 2. 화면 범위
- 대상 화면: `KR Detail`
- 대상 사용자: Leadership, PM, Analyst

## 3. 화면 구성
1. KR 헤더 카드
- KR 제목, metric/unit, target, 현재 누적 actual, 달성률(%), 신호등

2. 월별 실적 트렌드
- x축: `year_month`
- y축: `actual_value`
- source_type 배지(`manual/synced/calculated`) 표시

3. 실험 기여도 표
- 열: 실험명 / AARRR / weight / normalized_weight / contribution_score / 상태
- 정렬 기본값: contribution_score 내림차순

4. 경고/품질 알림
- weight 합계가 100이 아니면 경고 표시
- 월 실적 누락 월이 있으면 누락 경고 표시

## 4. 계산 규칙
- `actual_sum = sum(monthly.actual_value)`
- `achievement = min(100, actual_sum / target_value * 100)`
- `normalized_weight = weight / weight_sum`
- `contribution_score = achievement * normalized_weight`

## 5. 상태 규칙
- Green: 80 이상
- Yellow: 50 이상 80 미만
- Red: 50 미만

## 6. 인터랙션
- 실험 행 클릭 시 실험 상세 패널 오픈
- 월별 포인트 hover 시 입력 source_type/메모 노출
- 필터: 반기, 조직, AARRR, 상태

## 7. 예외 처리
- 연결 실험 없음: 빈 상태 컴포넌트 + "실험 연결하기" CTA
- target_value 0: 계산 불가 상태 및 데이터 오류 배지
- weight_sum 0: 기여도 계산 중단 + 설정 안내

## 8. 성능 목표
- KR Detail API 응답: 1초 이내(샘플 데이터 1k 레코드 기준)
- 화면 최초 렌더: 2초 이내

## 9. QA 체크포인트
- 계산식 수기 검증(샘플 3건)
- weight 변경 시 기여도 즉시 재계산
- source_type별 배지 색상/문구 일관성
