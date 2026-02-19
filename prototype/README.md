# OKR Dashboard Prototype

## 실행 방법
```bash
cd /Users/zonetwo/Documents/CODEX-okr-dashboard/prototype
npm install
npm run seed
npm run dev
```

브라우저: `http://localhost:4000`

## 핵심 기능
- 좌측 메뉴 기반 전체 화면 트리 (대시보드/목표/인풋/검색/관리/연동)
- 조직 마스터 반영: 14개 실, 6개 도메인(Food/QC/Food + QC/Partner/Delivery/Rider), AARRR 6옵션(- 포함)
- Objective/KR/Sub-KR/Initiative/Experiment/Link 생성 API
- KR-Experiment 기여도(weight) 기반 자동 집계
- 월 실적 upsert
- KR 상세 기여도 시각화
- Input 등록 시 분류/프로덕트/소스 기반 우선순위 자동 산정
- AuditLog + DecisionLog 기록/조회
- Dashboard 통합 테이블(`/dashboard/okr-table`)에서 OKR/Initiative 통합 조회
- 분류 자동 추론 + 수동 override(실 O / 실 KR / 팀 KR / Initiative)
- 시작값 대비 목표값 기준 Q1/Q2 달성률 실시간 반영

## 메뉴 트리
- Dashboard: Executive, Domain, KR Detail, Review
- 목표/이니셔티브: Objective, KR/Sub-KR, Initiative
- 인풋/우선순위: Input Source
- 검색/필터: 통합 검색
- 관리: 권한(RBAC), 조직 마스터, Audit/Decision Log
- 연동: Experiment Platform, DWH/BI

## 검증
```bash
cd /Users/zonetwo/Documents/CODEX-okr-dashboard/prototype
npm run smoke
```

## 데이터 파일
- 기본 저장: `/Users/zonetwo/Documents/CODEX-okr-dashboard/prototype/data/store.json`
- 대체 가능: `DATA_FILE=/path/to/file.json npm run dev`

## Render Free 배포 (비개발자용)
이 저장소에는 Render Blueprint 파일(`/Users/zonetwo/Documents/CODEX-okr-dashboard/render.yaml`)이 포함되어 있습니다.

### 내가 이미 해둔 것
- Render가 읽는 배포 설정 파일 추가 (`render.yaml`)
- Render 시작 시 데이터 파일이 없으면 샘플 데이터를 자동 seed 하도록 스크립트 추가 (`npm run start:render`)

### 당신이 해야 하는 것
1. GitHub에 변경사항 푸시
```bash
cd /Users/zonetwo/Documents/CODEX-okr-dashboard
git add render.yaml prototype/package.json prototype/README.md
git commit -m "Add Render Free deployment setup"
git push origin main
```
2. Render 대시보드에서 `New +` → `Blueprint` 선택
3. GitHub 저장소 `zonetwoproject/codex-okr-dashboard` 연결
4. 생성된 Web Service 확인 후 `Apply` 클릭
5. 배포 완료 후 발급된 URL 접속

### 참고 (Free 플랜 제한)
- 15분 유휴 시 서비스가 잠들 수 있으며, 다음 첫 요청이 느릴 수 있습니다.
- Free 플랜은 Persistent Disk를 지원하지 않아 데이터 영속성이 보장되지 않습니다.

## Vercel Hobby 전환 (무료)

Vercel Hobby로도 동작하도록 현재 프로토타입을 정리했습니다.

- 라우팅: 모든 요청을 `api/index.js` 서버리스 핸들러로 전달(`vercel.json`의 rewrite 사용)
- 정적 자산/SPA 라우팅: 기존 `public/`을 Express에서 그대로 제공
- Render 전용 `DATA_FILE` 설정은 제거하고, 운영에서는 Supabase 연결을 권장합니다.

### Vercel 배포 절차
1. `prototype/` 디렉터리 기준으로 GitHub 저장소를 Vercel에 연결
2. Framework preset: **Other** (또는 **Node**)
3. Environment Variables에 다음 값 설정
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NODE_ENV=production`
   - `APP_MARK_LABEL=Mark1` (권장, 운영 버전 라벨)
4. Deploy

### Vercel Hobby 운영 포인트
- Hobby는 무료이나 요청이 간헐적인 경우 콜드 스타트 지연이 있을 수 있습니다.
- 데이터 유실 방지를 위해 JSON 파일 기반 운영 대신 Supabase를 사용하는 것을 권장합니다.

## Mark1/Mark2 운영 방식 (권장)
- `main` = Mark1 운영 기준선
- `mark2` = Mark2 개발 브랜치
- `mark2`는 Vercel Preview URL에서 검증 후 `main`으로 PR 머지
- 장애 시 Vercel에서 직전 안정 배포를 `Promote`로 롤백

상세 절차 문서:
- `/Users/jabez/Documents/100. Projects/codex-okr-dashboard/docs/MARK_VERSIONING_GUIDE.md`

## Supabase 정규화 테이블로 분리하기
현재 앱 런타임은 JSON 파일 기반이지만, 아래 절차로 Supabase에 정규화된 테이블을 만들고 데이터를 이관할 수 있습니다.

### 1) Supabase SQL 실행
Supabase 프로젝트의 SQL Editor에서 아래 파일 내용을 실행하세요.
- `/Users/zonetwo/Documents/CODEX-okr-dashboard/prototype/supabase/schema.sql`

### 2) 로컬 환경변수 설정
```bash
export SUPABASE_URL="https://<project-ref>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
```

### 3) 로컬 JSON -> Supabase 이관
```bash
cd /Users/zonetwo/Documents/CODEX-okr-dashboard/prototype
npm install
npm run sync:to-supabase
```

### 4) Supabase -> 로컬 JSON 백업 복원
```bash
cd /Users/zonetwo/Documents/CODEX-okr-dashboard/prototype
npm run sync:from-supabase
```

### 5) 서버를 Supabase 연동 모드로 운영
Render 환경변수에 아래 2개를 추가하면 서버가 시작 시 Supabase에서 데이터를 읽고, 변경 시 자동 동기화합니다.
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

동작 방식:
- 서버 시작 시: Supabase 데이터를 로컬 캐시에 로드
- API로 데이터 변경 시: JSON 파일 저장 + Supabase 테이블 동기화

주의:
- `sync:to-supabase`는 대상 테이블 데이터를 지우고 현재 JSON 스토어 기준으로 다시 채웁니다.
- 반드시 `SUPABASE_SERVICE_ROLE_KEY`를 사용하고, 키는 절대 Git에 커밋하지 마세요.

## 알려진 한계 (Prototype)
- 영구 DB 미사용(JSON 파일 저장)
- 인증/세부 RBAC 미구현
- 외부 실험 플랫폼/DWH 실연동 미구현(mock 수준)
