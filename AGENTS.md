# Pastel Flow Agent Guide

본 문서는 프로젝트의 최상위 규칙 집합이며, 모든 상황에서 본 문서의 규칙을 우선한다.
Never modify.

## Product Model

- 다중 Action 단위의 묶음인 Workflow 런처
- 기존 Task/Adapter 모델은 legacy로 취급하고, 새 구현은 Action/Workflow 모델을 기준으로 한다. 해당 부분에 대한 수정을 최우선 진행.

## Basic Structure

- `electron`: main process, IPC, stores, runners
- `src`: renderer, shared types, styles

## Architecture Rules

- 각 파일은 하나의 명확한 책임만을 가지는 단일 책임 원칙을 철저히 준수
- 신규 구현 시 별도 모듈 분리를 우선적으로 검토
- `dist`, `dist-electron`, `node_modules`경로는 무시
- 읽기 작업은 승인된 PowerShell 경로로 진행

## UI Rules

- Using `@heroui/react` components, token, style firstly.
- Basic layout is top bar, left side panel, right working area.

## Validation

- Run `npm run check` after implement.(Never proceed any other validatiion.Can skipped when modifing documents only)