#!/usr/bin/env bash
set -euo pipefail

MARK1_TAG="${1:-admin-mark1}"
MARK2_BRANCH="${2:-mark2}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Git 저장소가 아닙니다."
  exit 1
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "${CURRENT_BRANCH}" != "main" ]]; then
  echo "현재 브랜치가 main이 아닙니다. main에서 실행하세요."
  exit 1
fi

if git rev-parse "${MARK1_TAG}" >/dev/null 2>&1; then
  echo "태그 ${MARK1_TAG} 는 이미 존재합니다. 태그 생성은 건너뜁니다."
else
  git tag -a "${MARK1_TAG}" -m "Admin Mark1 baseline"
  echo "태그 생성 완료: ${MARK1_TAG}"
fi

if git show-ref --verify --quiet "refs/heads/${MARK2_BRANCH}"; then
  echo "브랜치 ${MARK2_BRANCH} 는 이미 존재합니다."
else
  git branch "${MARK2_BRANCH}"
  echo "브랜치 생성 완료: ${MARK2_BRANCH}"
fi

echo
echo "다음 단계:"
echo "1) git push origin ${MARK1_TAG}"
echo "2) git push -u origin ${MARK2_BRANCH}"
