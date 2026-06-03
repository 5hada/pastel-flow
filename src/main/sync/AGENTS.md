# Sync Agent Guide

이 파일은 `electron/sync` 아래에 적용된다.

## Scope

- 현재 sync는 mock export/import만 담당한다.
- 실제 서버 DB, 계정 backend, remote transport는 구현하지 않는다.

## Rules

- secret 값, 브라우저 프로필, 로그인 세션, 기기별 실행 파일 절대 경로는 export하지 않는다.
- 새 모델에서는 Workflow/Action 데이터를 우선 export/import 대상으로 본다.
- legacy task는 호환을 위해 다루되 새 기능의 기준으로 삼지 않는다.
- 충돌 해결은 명시적이고 되돌릴 수 있게 설계한다.
