# Tool Module Agent Guide

This document apply to all files and directories under `electron/tools`.

## Source Of Truth

- Tool Module 제작 규격은 루트 `tool-schema.md`이다.
- 에이전트가 규격을 빠르게 파악할 때는 루트 `tool-schema-agents.md`를 먼저 읽는다.
- 이 폴더의 코드는 그 규격을 검증, 등록, 실행하는 구현만 담당한다.

## Registration

- 사용자는 Tool Module 루트 폴더 하나를 등록한다.
- 루트 폴더 내부 계층 구조를 스캔해 `manifest.json`과 `logic.mjs`가 있는 후보를 찾는다.
- 도구 목록은 루트 폴더의 실제 계층 구조를 보존해야 한다.