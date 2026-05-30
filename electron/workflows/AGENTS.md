# Workflow Agent Guide

이 파일은 `electron/workflows` 아래에 적용된다.

## Responsibilities

- Workflow 단위 실행을 담당한다.
- Action 순서, enabled 상태, input mapping, 실패 처리 정책을 적용한다.
- legacy task runner로 새 기능을 우회하지 않는다.

## Rules

- Workflow 실행 상태와 이벤트는 Workflow 중심으로 저장한다.
- Action별 결과는 Workflow run의 하위 상세로 기록한다.
- stop/restart 요청은 Workflow 단위로 받고 가능한 Action handler에 위임한다.
- Scheduler는 Workflow schedule을 기준으로 동작해야 한다.
