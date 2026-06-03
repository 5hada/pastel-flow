# Renderer/Shared Agent Guide

This document apply to all files and directories under `src`.

## Responsibilities

- Electron/Node API는 직접 사용하지 않고 preload API를 통해 호출한다.
- UI 상태, 폼 상태, API 타입, presentational component를 분리한다.