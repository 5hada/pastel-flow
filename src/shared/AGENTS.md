# Shared Types Agent Guide

This document apply to all files and directories under `src/shared`.

## Responsibilities

- main process와 renderer가 함께 쓰는 타입, defaults, normalize helper를 둔다.
- Electron, Node, DOM API에 의존하지 않는다.

## Rules

- 타입 변경 시 defaults와 normalize helper도 함께 점검한다.
- 민감 값은 타입에 직접 넣지 말고 secret ref로 표현한다.
- sync/export 대상과 local-only 값을 명확히 분리한다.