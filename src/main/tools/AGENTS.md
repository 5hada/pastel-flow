# Tool Module Agent Guide

This document apply to all files and directories under `electron/tools`.

## Source Of Truth

- Tool Module 제작 규격은 루트 `tool-schema.md`이다.
- 에이전트가 규격을 빠르게 파악할 때는 루트 `tool-schema-summary.md`를 먼저 읽는다.
- 이 폴더의 코드는 그 규격을 검증, 등록, 실행하는 구현만 담당한다.

## Registration

- 사용자는 개별 도구에 대한 폴더 경로를 지정한다.
- 폴더 내부 계층 구조를 스캔해 `manifest.json`과 `logic.mjs`가 존재하는 적절한 tool module인지 검사한다.
- 올바른 tool임이 확인될 시 해당 도구를 user data directory에 별도 복제 저장한다.