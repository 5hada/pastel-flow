# Electron Main Agent Guide

This document apply to all files and directories under `electron`.

## Responsibilities

- IPC 등록, 로컬 저장소, Electron `userData`, 외부 프로세스, runner를 담당한다.
- Renderer에 파일 시스템이나 Node 권한을 직접 넘기지 않는다.
- preload API는 필요한 기능만 좁게 노출한다.

## Structure

- `settings`, `devices`, `secrets`, `sync`: 각 도메인별 store/ipc.
- `tasks`: legacy task 호환 레이어.
- `workflows`: 새 Workflow runner.
- `tools`: Tool Module 등록, 검증, 실행.

## Rules

- 저장소 변경은 normalize/migration 경로를 함께 고려한다.
- secret 값은 renderer로 반환하지 않는다.
- 실행 이벤트는 Workflow 중심으로 기록하고 필요한 경우 Action 단위 상세를 추가한다.