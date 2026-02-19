# Admin Mark 버전 관리 가이드 (GitHub + Vercel + Supabase)

작성일: 2026-02-19

## 1) 운영 원칙
- `main` 브랜치 = 운영 안정 버전(Mark1)
- `mark2` 브랜치 = 차세대 UI/UX 개발 전용
- 코드 복제(별도 앱 폴더 복사) 대신 브랜치/태그로 버전 관리
- Vercel Production은 `main`만 연결

## 2) 초기 세팅 (현재 버전을 Mark1로 고정)
자동 실행 스크립트:
```bash
cd /Users/jabez/Documents/100. Projects/codex-okr-dashboard
./scripts/setup_mark_versioning.sh
```

수동 실행:
```bash
cd /Users/jabez/Documents/100. Projects/codex-okr-dashboard

# 현재 운영 기준선 태그
git tag -a admin-mark1 -m "Admin Mark1 baseline"
git push origin admin-mark1

# Mark2 개발 브랜치 생성
git checkout -b mark2
git push -u origin mark2

# 운영 브랜치로 복귀
git checkout main
```

## 3) Vercel 세팅
1. Project Settings > Git
- Production Branch를 `main`으로 고정

2. Deployments 정책
- `main` 머지 = Production 배포
- `mark2` 푸시 = Preview 배포 URL 생성

3. 환경변수 (선택)
- `APP_MARK_LABEL=Mark1` (Production)
- `APP_MARK_LABEL=Mark2` (Preview 또는 mark2 전용 환경)

참고:
- 앱 좌상단에 `Prototype Mark1(main)` 또는 `Prototype Mark2(mark2)`처럼 자동 표기됩니다.

## 4) 릴리즈/롤백 시나리오
1. Mark2 출시
- `mark2` -> `main` PR 생성
- QA/PM 체크 완료 후 merge
- 배포 완료 후 태그 생성
```bash
git checkout main
git pull
git tag -a admin-mark2 -m "Admin Mark2 release"
git push origin admin-mark2
```

2. 문제 발생 시
- Vercel Deployments에서 직전 안정 배포(Mark1) `Promote` 실행
- 이후 GitHub에서도 `revert` 커밋으로 코드 상태 정렬

## 5) Supabase 운영 주의점
- Mark2 안정화 전까지 파괴적 스키마 변경 금지
- 컬럼/테이블 삭제는 다음 릴리즈로 분리
- 필요 시 먼저 추가(Expand) -> 코드 전환 -> 삭제(Contract) 순서 준수

## 6) PM 체크리스트
- [ ] `main` 외 브랜치에서는 Production 배포가 되지 않는다.
- [ ] `mark2` 변경은 Preview URL에서만 검증한다.
- [ ] 릴리즈 전/후 태그(`admin-mark1`, `admin-mark2`)를 남긴다.
- [ ] 롤백 담당자 1명을 배포 전에 지정한다.
