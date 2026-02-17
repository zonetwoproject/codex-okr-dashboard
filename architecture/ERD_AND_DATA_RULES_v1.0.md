# OKR Dashboard ERD & Data Rules v1.0

작성일: 2026-02-14

## 1. ERD (Prototype)
```mermaid
erDiagram
    DOMAIN ||--o{ DIVISION : has
    DIVISION ||--o{ TEAM : has

    HALF_YEAR ||--o{ OBJECTIVE : contains
    OBJECTIVE ||--o{ KEY_RESULT : contains
    KEY_RESULT ||--o{ SUB_KEY_RESULT : contains
    SUB_KEY_RESULT ||--o{ INITIATIVE : drives

    KEY_RESULT ||--o{ KR_EXPERIMENT_LINK : links
    EXPERIMENT ||--o{ KR_EXPERIMENT_LINK : links

    KEY_RESULT ||--o{ MONTHLY_PERFORMANCE : has
    OBJECTIVE ||--o{ MONTHLY_PERFORMANCE : has
    INITIATIVE ||--o{ MONTHLY_PERFORMANCE : has

    AUDIT_LOG }o--|| KEY_RESULT : references
    AUDIT_LOG }o--|| OBJECTIVE : references
    AUDIT_LOG }o--|| EXPERIMENT : references

    DOMAIN {
      string id PK
      string name
    }
    DIVISION {
      string id PK
      string domain_id FK
      string name
    }
    TEAM {
      string id PK
      string division_id FK
      string name
    }
    HALF_YEAR {
      string id PK
      int year
      string half "H1|H2"
      bool is_active
    }
    OBJECTIVE {
      string id PK
      string half_year_id FK
      string team_id FK
      string title
      string owner
      string status
      datetime deleted_at
    }
    KEY_RESULT {
      string id PK
      string objective_id FK
      string metric_type
      string unit
      float target_value
      float current_value
      string signal "green|yellow|red"
      datetime deleted_at
    }
    SUB_KEY_RESULT {
      string id PK
      string key_result_id FK
      string title
      float target_value
    }
    INITIATIVE {
      string id PK
      string sub_kr_id FK
      string title
      float progress_quant
      int status_score
    }
    EXPERIMENT {
      string id PK
      string title
      string aarrr_tag
      string owner
      string status
      datetime deleted_at
    }
    KR_EXPERIMENT_LINK {
      string id PK
      string kr_id FK
      string experiment_id FK
      float weight
      string rationale
      datetime created_at
    }
    MONTHLY_PERFORMANCE {
      string id PK
      string target_type "objective|kr|initiative"
      string target_id
      string year_month "YYYY-MM"
      float actual_value
      string source_type "manual|synced|calculated"
      string note
      datetime updated_at
    }
    AUDIT_LOG {
      string id PK
      string actor
      string reason
      string action
      string entity_type
      string entity_id
      json before_value
      json after_value
      datetime timestamp
    }
```

## 2. 핵심 무결성 규칙
1. Half-year 필수: Objective/KR 생성 시 반기 미지정 금지.
2. KR 필수 메타: `metric_type`, `unit`, `target_value` 필수.
3. 링크 가중치: KR-Experiment weight는 0~100 범위.
4. 월 실적 upsert 키: `(target_type, target_id, year_month)` 유니크.
5. 삭제 정책: soft-delete(`deleted_at`)만 허용, 참조 엔티티가 있으면 hard-delete 금지.
6. 감사 로그: 상태/목표/정의/링크 변경 시 before/after 필수 기록.

## 3. 계산 규칙
- KR 달성률: `achievement = min(100, (actual_sum / target_value) * 100)`
- 신호등 임계값(공통):
  - Green: 80 이상
  - Yellow: 50 이상 80 미만
  - Red: 50 미만
- 실험 기여도 점수:
  - `contribution_score = achievement * (weight / weight_sum)`
  - `weight_sum = 동일 KR에 연결된 모든 실험 weight 합`

## 4. 인덱스/조회 최적화 (Prototype 수준)
- `monthly_performance(target_type, target_id, year_month)`
- `kr_experiment_link(kr_id)`
- `audit_log(entity_type, entity_id, timestamp)`

## 5. 확장 포인트
- Sprint 2: Role-permission 테이블 정규화
- Sprint 2: DecisionLog 별도 엔티티 도입
- Sprint 3: 외부 연동 상태/재시도 큐 테이블 추가
